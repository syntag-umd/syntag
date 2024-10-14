# utils.py

########################
# GENERATION HELPER FN #
########################

import asyncio
import hmac
from typing import List
import uuid
import tiktoken
from fastapi import Depends, HTTPException, status
from fastapi.security import APIKeyHeader, APIKeyQuery
from sqlalchemy.future import select
from sqlalchemy.orm import Session
from sqlalchemy.sql.expression import or_
from contextlib import contextmanager
import logging
from app.database.session import get_db
from app.database.tables.user import (
    User,
)  # Adjust this import to your models' actual location
from app.models.enums import DEFAULT_TOKEN_COUNT, Language, PossibleOpenAIModels


# Adjust these imports according to your actual dependency functions' locations
from app.services.clerk.utils import verify_token


@contextmanager
def suppress_library_logging(libraries: List[str], level=logging.CRITICAL):
    prev_levels = dict()
    for lib_name in libraries:
        logger = logging.getLogger(lib_name)
        prev_levels[lib_name] = logger.level
        logger.setLevel(level)
    try:
        yield
    finally:
        for lib_name, prev_level in prev_levels.items():
            logger = logging.getLogger(lib_name)
            logger.setLevel(prev_level)


def format_error_message(error):
    # Extract location and message
    location = "->".join(str(loc) for loc in error["loc"])
    msg = error["msg"]
    # Append additional context for 'max_items' or 'min_items' type validations
    if "max_items" in msg or "min_items" in msg:
        # Example: 'ensure this value has at most 2 items'
        item_count_msg = msg.split(" ")[-2]  # Extract the numeric value
        msg += f" (items allowed: {item_count_msg})"
    return f"{location}: {msg}"


def callback_helper(websocket):
    request_id_to_future = {}  # Maps request IDs to asyncio Future objects

    async def listen_for_responses():
        while True:
            response = await websocket.receive_json()
            request_id = response.get("requestId")
            future = request_id_to_future.get(request_id)
            if future and not future.done():
                future.set_result(response)

    # Start listening for responses in a separate task
    asyncio.create_task(listen_for_responses())

    async def callback(functionName, functionArgs):
        request_id = str(uuid.uuid4())  # Generate a unique request ID
        future = asyncio.Future()
        # Store the future with the request ID
        request_id_to_future[request_id] = future

        await websocket.send_json(
            {
                "type": "callback",
                "functionName": functionName,
                "functionArgs": functionArgs,
                "requestId": request_id,
            }
        )

        # Wait for the future to have a result set by listen_for_responses
        response = await future
        return response.get("result")

    return callback


def get_token_count(
    message: str, openai_model: PossibleOpenAIModels = DEFAULT_TOKEN_COUNT
):

    enc = tiktoken.encoding_for_model(openai_model)

    return len(enc.encode(message))


VAPI_MESSAGE_PARAM = "user_message"


def fetch_message_from_vapi(function_message):

    if not (functionCall := function_message.get("functionCall")):
        return None
    if not (parameters := functionCall.get("parameters")):
        return None
    return parameters.get(VAPI_MESSAGE_PARAM)


VAPI_RESPONSE_ENGLISH = """
YOUR RESPONSE SHOULD BE EXACTLY THE FOLLOWING, and NOTHING ELSE:
{response}
AGAIN, YOUR RESPONSE SHOULD BE EXACTLY THE FOLLOWING, and NOTHING ELSE.
"""

VAPI_RESPONSE_SPANISH = """
SU RESPUESTA DEBE SER EXACTAMENTE LA SIGUIENTE, y NADA MÁS:
{response}
NUEVAMENTE, SU RESPUESTA DEBE SER EXACTAMENTE LA SIGUIENTE, y NADA MÁS.
"""


def format_vapi_response(response: str, language: Language):
    if language == Language.SPANISH:
        return VAPI_RESPONSE_SPANISH.format(response=response)
    return VAPI_RESPONSE_ENGLISH.format(response=response)


VAPI_FUNCTION_NAME = "fetchCorrectResponse"

VAPI_FUNCTION_DESCRIPTION = """
This function will fetch the correct response for any given user. Replying with the response of this \
function is enough to guarantee that the user's message is processed correctly. \
"""

VAPI_SYSTEM_PROMPT = f"""
YOU HAVE NO BRAIN OR THINKING CAPACITY WHATSOEVER. YOU CANNOT MAKE A SINGLE DECISION BY YOURSELF. \
LUCKY FOR YOU, I HAVE PROVIDED A FUNCTION FOR YOU THAT WILL EXECUTE ALL OF THE THINKING AND PROCESSING \
NO MATTER WHAT THE USER SAYS. EVEN IF THEIR MESSAGE IS SOMETHING AS SIMPLE AS "HELLO", YOU WILL STILL
EXECUTE THE FUNCTION. \
THE NAME OF THE FUNCTION IS {VAPI_FUNCTION_NAME}. ENGAGING IN ANY CONVERSATION WILL REQUIRE YOU TO
REPEATEDLY CALL THIS FUNCTION FOR EVERY USER INPUT. YOU CANNOT THINK - YOU CAN ONLY CALL THIS FUNCTION. \
"""


def fetch_vapi_model():
    model = {
        "functions": [
            {
                "name": VAPI_FUNCTION_NAME,
                "description": VAPI_FUNCTION_DESCRIPTION,
                "parameters": {
                    "type": "object",
                    "properties": {VAPI_MESSAGE_PARAM: {"type": "string"}},
                },
            }
        ],
        "model": "gpt-3.5-turbo",
        "provider": "openai",
        "systemPrompt": VAPI_SYSTEM_PROMPT,
    }

    return model


def fetch_vapi_voice(language: Language, gender: str):

    if language == Language.SPANISH:
        if gender == "male":
            return "es-MX-CecilioNeural"
        return "es-MX-RenataNeural"
    if gender == "male":
        return "andrew"
    return "emma"


# auto_error=False makes it optional
api_key_query = APIKeyQuery(name="api_key", auto_error=False, scheme_name="ApiKeyQuery")
api_key_header = APIKeyHeader(
    name="X-API-Key", auto_error=False, scheme_name="APIKeyHeader"
)
clerk_jwt_header = APIKeyHeader(
    name="X-CLERK-JWT", auto_error=False, scheme_name="ClerkJWTHeader"
)


def get_user_from_req(
    api_key_query: str = Depends(api_key_query),
    api_key_header: str = Depends(api_key_header),
    clerk_jwt_header: str = Depends(clerk_jwt_header),
    db: Session = Depends(get_db),  # Using the synchronous get_db function
):
    if not api_key_query and not api_key_header and not clerk_jwt_header:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An API key must be provided either as a query parameter or as a header",
        )

    conditions = []
    if api_key_query:
        conditions.append(User.api_key == api_key_query)
    if api_key_header:
        conditions.append(User.api_key == api_key_header)
    if clerk_jwt_header:
        token = verify_token(clerk_jwt_header)
        if token["external_id"]:
            conditions.append(User.uuid == uuid.UUID(token["external_id"]))
        elif token["sub"]:
            conditions.append(User.clerk_id == token["sub"])

    query = select(User).where(or_(*conditions))
    try:
        result = db.execute(query)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )
    user = result.scalars().first()

    if user:
        return user
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate credentials",
        )


def constant_time_compare(str1, str2):
    try:
        return hmac.compare_digest(str1, str2)
    except Exception:
        return False


admin_key_header = APIKeyHeader(
    name="X-Admin-Key", auto_error=False, scheme_name="AdminKey"
)
