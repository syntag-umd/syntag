import base64
import json
import logging
from fastapi import (
    APIRouter,
    Body,
    Depends,
    HTTPException,
    Query,
    Request,
    Response,
    WebSocket,
)
from twilio.twiml.voice_response import VoiceResponse, Connect, Stream
from deepgram import (
    DeepgramClient,
    DeepgramClientOptions,
    LiveTranscriptionEvents,
    LiveOptions,
)
from app.core.config import settings
from app.core.config import get_base_url

router = APIRouter(prefix="/sapi")


# Accept webhook to start call from twilio
""" @router.post("/twilio/inbound-call")
async def handle_inbound_call_twilio(request: Request):
    # https://www.twilio.com/docs/voice/twiml#request-parameters
    form_data = await request.form()
    form_dict = dict(form_data)
    logging.info(form_dict)
    caller = form_dict.get("Caller")
    called = form_dict.get("Called")
    base_url = get_base_url(request)
    response = VoiceResponse()
    response.say(f"Hello, {caller}. You called {called}.")
    print(response)
    return Response(content=str(response), media_type="application/xml")

    response = VoiceResponse()
    connect = Connect()
    connect.stream(url=f"{base_url}/sapi/ws")
    response.append(connect)
    return response """


# Have a webhook that transcribes audio, chat response, and TTS
""" 
@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    dg_client: DeepgramClient = DeepgramClient(api_key=settings.DEEPGRAM_API_KEY)
    dg_connection = dg_client.listen.websocket.v("1")

    def on_open(open_event, **kwargs):
        print(f"Connection opened: {open_event}")

    def on_message(self, result, **kwargs):
        sentence = result.channel.alternatives[0].transcript
        # if len(sentence) == 0:
        #     return
        print(f"speaker: {sentence}")
        speech_final = result.speech_final

    def on_utterance_end(**kwargs):
        print("Utterance end", kwargs)

    def on_speech_started(**kwargs):
        print("Speech started", kwargs)

    def on_error(error, **kwargs):
        print(f"Error: {error}")

    def on_close(close_event, **kwargs):
        print(f"Connection closed: {close_event}")

    # Attach event handlers to the WebSocket connection
    dg_connection.on(LiveTranscriptionEvents.Open, on_open)
    dg_connection.on(LiveTranscriptionEvents.Transcript, on_message)
    dg_connection.on(LiveTranscriptionEvents.UtteranceEnd, on_utterance_end)
    dg_connection.on(LiveTranscriptionEvents.SpeechStarted, on_speech_started)
    dg_connection.on(LiveTranscriptionEvents.Error, on_error)
    dg_connection.on(LiveTranscriptionEvents.Close, on_close)

    # connect to websocket
    options = LiveOptions(
        encoding="mulaw",
        sample_rate=8000,
        model="nova-2",
        language="multi",
        punctuate=True,
        utterance_end_ms=1000,
        vad_events=True,
    )

    print("\n\nPress Enter to stop recording...\n\n")
    if dg_connection.start(options) is False:
        print("Failed to start connection")
        return

    connected_event = await websocket.receive_json()
    logging.info(connected_event)
    # https://www.twilio.com/docs/voice/media-streams/websocket-messages#start-message
    start_event = await websocket.receive_json()
    logging.info(start_event)
    stream_sid = start_event.get("start").get("streamSid")

    while True:
        data = await websocket.receive_json()
        event_type = data.get("event")
        logging.info(f"Received event: {event_type}")
        if event_type == "media":
            # media payload is base64 encoded
            # it is encoded audio/x-mulaw. Has sample rate of 8000 Hz
            media_payload = data.get("media").get("payload")
            pass
            dg_connection.send("data")
            continue
            media_message = {
                "event": "media",
                "streamSid": stream_sid,
                "media": {"payload": base64.b64encode("raw_mulaw").decode("ascii")},
            }
        elif event_type == "stop":
            pass

        await websocket.send_text(f"Message text was: {data}")

"""
# Not exactly sure what is sent here
# @router.post("/call-status-twilio")


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
    DeepgramEndpointingConfig
)
from vocode.streaming.synthesizer.eleven_labs_websocket_synthesizer import (
    ElevenLabsSynthesizerConfig,
)

from vocode.logging import configure_pretty_logging

configure_pretty_logging()


config_manager = InMemoryConfigManager()
telephony_server_base_url = (
    get_base_url(None).replace("https://", "").replace("http://", "") + "/sapi"
)

# transcriber_config = DeepgramTranscriberConfig.from_telephone_input_device(
#    api_key=settings.DEEPGRAM_API_KEY, language="multi", model="nova-2", sampling_rate=8000
# )
transcriber_config = DeepgramTranscriberConfig(
    api_key=settings.DEEPGRAM_API_KEY,
    language="multi",
    model="nova-2",
    sampling_rate=8000,
    audio_encoding="mulaw",
    chunk_size=20 * 160,
    endpointing_config=DeepgramEndpointingConfig()
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


