import base64
import json
import logging
from fastapi import (
    APIRouter,
    Body,
    Depends,
    Form,
    HTTPException,
    Query,
    Request,
    Response,
    WebSocket,
)
from sqlalchemy import or_, select
from twilio.twiml.voice_response import VoiceResponse, Connect, Stream
from app.core.config import settings
from app.core.config import get_base_url
import uuid

from app.database.tables.conversation import Conversation
from sqlalchemy.orm import Session, joinedload
from app.database.session import get_isolated_db
from app.database.tables.phone_number import PhoneNumber
from app.models.enums import ChatMedium
from vocode.streaming.telephony.conversation.twilio_phone_conversation import (
    TwilioPhoneConversation,
)

router = APIRouter(prefix="/sapi")

telephony_server_base_url = (
    get_base_url(None).replace("https://", "").replace("http://", "") + "/sapi"
)


# Accept webhook to start call from twilio
@router.post("/twilio/inbound-call")
async def handle_inbound_call_twilio(
    request: Request,
    twilio_call_sid: str = Form(alias="CallSid"),
    from_number: str = Form(alias="From"),  # Caller
    to_number: str = Form(alias="To"),  # Receiver
    db: Session = Depends(get_isolated_db),
):
    # https://www.twilio.com/docs/voice/twiml#request-parameters
    convo_uuid = uuid.uuid4()
    logging.info(
        repr(
            {
                "convo_uuid": convo_uuid,
                "twilio_call_sid": twilio_call_sid,
                "from_number": from_number,
                "to_number": to_number,
            }
        )
    )

    query = (
        select(PhoneNumber)
        .where(or_(PhoneNumber.pn == to_number))
        .options(
            joinedload(PhoneNumber.voice_assistant),
            joinedload(PhoneNumber.user),
        )
    )
    db_phone_number = db.execute(query).scalar()
    if not db_phone_number:
        raise HTTPException(status_code=400, detail="Phone number not found")

    convo = Conversation(
        uuid=convo_uuid,
        userUuid=db_phone_number.user.uuid,
        medium=ChatMedium.PHONE,
        voice_assistant_uuid=db_phone_number.voice_assistant.uuid,
        twilio_call_sid=twilio_call_sid,
        assistant_pn=to_number,
        caller_pn=from_number,
        direction="inbound",
    )
    db.add(convo)
    db.commit()

    base_url = get_base_url(request)

    response = VoiceResponse()
    connect = Connect()
    connect.stream(url=f"wss://{telephony_server_base_url}/connect_call/{str(convo_uuid)}")
    response.append(connect)

    return Response(content=str(response), media_type="application/xml")



# vocode
from vocode.streaming.telephony.server.base import (
    TelephonyServer,
    TwilioInboundCallConfig,
)
from vocode.streaming.models.agent import ChatGPTAgentConfig
from vocode.streaming.models.message import BaseMessage
from vocode.streaming.models.telephony import TwilioConfig
from vocode.streaming.telephony.config_manager.in_memory_config_manager import (
    InMemoryConfigManager,
)
from vocode.streaming.transcriber.deepgram_transcriber import (
    DeepgramTranscriberConfig,
    DeepgramEndpointingConfig,
)
from vocode.streaming.synthesizer.eleven_labs_websocket_synthesizer import (
    ElevenLabsSynthesizerConfig,
)

from vocode.streaming.transcriber.default_factory import DefaultTranscriberFactory
from vocode.streaming.agent.default_factory import DefaultAgentFactory
from vocode.streaming.synthesizer.default_factory import DefaultSynthesizerFactory
from vocode.logging import configure_pretty_logging

configure_pretty_logging()


config_manager = InMemoryConfigManager()


def get_phone_conversation(convo: Conversation):
    transcriber_config = DeepgramTranscriberConfig(
        api_key=settings.DEEPGRAM_API_KEY,
        language="multi",
        model="nova-2",
        sampling_rate=8000,
        audio_encoding="mulaw",
        chunk_size=20 * 160,
        endpointing_config=DeepgramEndpointingConfig(),
    )

    agent_config = ChatGPTAgentConfig(
        openai_api_key=settings.OPENAI_API_KEY,
        model_name="gpt-4o-mini",
        max_tokens=1024,
        initial_message=BaseMessage(text="What up"),
        prompt_preamble="Have a pleasant conversation about life",
        generate_responses=True,
    )

    synthesizer_config = ElevenLabsSynthesizerConfig.from_telephone_output_device(
        api_key=settings.ELEVEN_LABS_API_KEY,
        voice_id="ErXwobaYiN019PkySvjV",
        experimental_websocket=True,
    )

    phone_conversation = TwilioPhoneConversation(
        to_phone=convo.assistant_pn,
        from_phone=convo.caller_pn,
        base_url=telephony_server_base_url,
        config_manager=config_manager,
        transcriber_config=transcriber_config,
        agent_config=agent_config,
        synthesizer_config=synthesizer_config,
        twilio_config=TwilioConfig(
            account_sid=settings.TWILIO_ACCOUNT_SID,
            auth_token=settings.TWILIO_AUTH_TOKEN,
        ),
        twilio_sid=convo.twilio_call_sid,
        direction=convo.direction,
        transcriber_factory=DefaultTranscriberFactory(),
        agent_factory=DefaultAgentFactory(),
        synthesizer_factory=DefaultSynthesizerFactory(),
        events_manager=None,
    )


    return phone_conversation


@router.websocket("/connect_call/{convo_uuid}")
async def websocket_endpoint(
    websocket: WebSocket, convo_uuid: str, db: Session = Depends(get_isolated_db)
):
    try:
        convo_uuid = uuid.UUID(convo_uuid)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid UUID format")

    query = select(Conversation).where(Conversation.uuid == convo_uuid)
    convo = db.execute(query).scalar()
    if not convo:
        raise HTTPException(status_code=400, detail="Conversation not found")

    await websocket.accept()
    logging.info("Phone WS connection opened for chat {}".format(convo_uuid))

    phone_conversation_twilio = get_phone_conversation(convo)

    await phone_conversation_twilio.attach_ws_and_start(websocket)
    logging.info("Phone WS connection closed for chat {}".format(convo_uuid))


# Not exactly sure what is sent here
# @router.post("/call-status-twilio")


# vocode wrapper of everything
"""
telephony_server = TelephonyServer(
    # The url of the WS is:  <Stream url="wss://{{ base_url }}/connect_call/{{ id }}" />
    base_url=telephony_server_base_url,
    config_manager=config_manager,
    inbound_call_configs=[
        TwilioInboundCallConfig(
            url="/twilio/inbound-call",
            transcriber_config=transcriber_config,
            agent_config=agent_config,
            synthesizer_config=synthesizer_config,
            twilio_config=TwilioConfig(
                account_sid=settings.TWILIO_ACCOUNT_SID,
                auth_token=settings.TWILIO_AUTH_TOKEN,
            ),
        )
    ],
)

router.include_router(telephony_server.get_router())
"""


# TODO
# Use azure gpt-4o-mini for the request

# TODO
# Add actions/tool calls. Can be done by changing the agent_config
# https://docs.vocode.dev/open-source/agents-with-actions
