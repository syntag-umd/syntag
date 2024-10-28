from datetime import datetime

from typing import Optional, Union
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database.session import get_isolated_db
from app.database.tables.user import User
from app.models.enums import Language
from app.services.vapi.utils import vapi_secret_header
from app.models.schemas import GetVapiConfigResponse
from app.utils import get_user_from_req, admin_key_header
from app.services.vapi.generated_models import ServerMessage, ServerMessageResponse
from app.models.utils import IgnoreValidation

from app.routes.vapi.handlers.assistant_request import handle_assistant_request
from app.routes.vapi.handlers.eoc_report import handle_end_of_call_report
from app.routes.vapi.handlers.tool_calls import handle_tool_calls

router = APIRouter(prefix="/vapi")

@router.post("/get-vapi-config", response_model=GetVapiConfigResponse)
async def get_vapi_config(
    conversation_uuid: str = Query(..., title="The UUID of the conversation"),
    language: Optional[Language] = Query(
        None, title="The language of the conversation (Either ENGLISH or SPANISH)"
    ),
    end_message: Optional[str] = Query(
        None, title="The message to send when the conversation ends"
    ),
    fillers_enabled: Optional[bool] = Query(
        True, title="Whether to use fillers in the conversation"
    ),
    first_message: Optional[str] = Query(
        None, title="The first message to send to the conversation"
    ),
    gender: Optional[str] = Query(
        "male", title="The gender of the call bot (either male or female)"
    ),
    user: User = Depends(get_user_from_req),
) -> GetVapiConfigResponse:
    """If this were in the server-url, it could be to dynamically get a vapi assistant.
    We can interject memory at the start of the call. For past callers,
    we could have the first message be hello {caller.name}
    """
    language = language or Language.ENGLISH

    END_MESSAGE = (
        "Thanks for your time. Goodbye!"
        if language == Language.ENGLISH
        else "Gracias por su tiempo. ¡Adiós!"
    )
    FIRST_MESSAGE = (
        "Hello! How can I help you today?"
        if language == Language.ENGLISH
        else "¡Hola! ¿En qué puedo ayudarte hoy?"
    )
    SERVER_URL = "https://api.syntag.ai/vapi/vapi-conversation-response?conversation_uiid={conversation_uuid}"
    RESPONSE_DELAY_SECONDS = 0.4
    SILENCE_TIMEOUT_SECONDS = 30

    vapi_language = "en" if language == Language.ENGLISH else "es"

    model = fetch_vapi_model()

    voice = fetch_vapi_voice(language, gender)

    payload = {
        "endCallMessage": end_message or END_MESSAGE,
        "fillersEnabled": fillers_enabled,
        "firstMessage": first_message or FIRST_MESSAGE,
        "language": vapi_language,
        "model": model,  # error on this line because model is not defined as string
        "responseDelaySeconds": RESPONSE_DELAY_SECONDS,
        "serverUrl": SERVER_URL.format(conversation_uuid=conversation_uuid),
        "silenceTimeoutSeconds": SILENCE_TIMEOUT_SECONDS,
        "serverMessages": [
            "end-of-call-report",
            "status-update",
            "hang",
            "function-call",
            "transcript",
        ],
        "voice": {
            "provider": "azure",
            "voiceId": voice,
        },
    }

    return GetVapiConfigResponse.model_validate(payload)

@router.post("/server-url", response_model=Optional[ServerMessageResponse])
async def server_url(
    body: IgnoreValidation[ServerMessage],
    db: Session = Depends(get_isolated_db),
    vapi_secret=Depends(vapi_secret_header),
    admin_key=Depends(admin_key_header),
) -> Union[ServerMessageResponse, None]:
    try:
        # Authentication logic

        message_type = body["message"]["type"]

        if message_type == "end-of-call-report":
            return await handle_end_of_call_report(body, db)
        elif message_type == "assistant-request":
            return await handle_assistant_request(body, db)
        elif message_type == "tool-calls":
            return await handle_tool_calls(body, db)
        else:
            return None

    except Exception as e:
        # Error handling
        raise HTTPException(
            status_code=500, detail="Error processing server message from vapi"
        ) from e