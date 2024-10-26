import logging
import time
from typing import Optional
from typing_extensions import TypedDict
from fastapi import HTTPException
import jwt
from app.core.config import settings


# decoded token should have type listed here https://clerk.com/docs/backend-requests/resources/session-tokens
class ClerkTokenPayload(TypedDict, total=False):
    sub: str  # clerk id
    sid: str  # session id
    exp: int  # expiration time in unix time stampt
    external_id: Optional[str]  # external id (their uuid in the database)


def verify_token(token: str) -> ClerkTokenPayload:
    try:
        decoded: ClerkTokenPayload = jwt.decode(
            token, settings.PUBLIC_KEY_PEM_CLERK, algorithms=["RS256"]
        )
    except jwt.ExpiredSignatureError:
        logging.warn("token invalid")
        raise HTTPException(status_code=401, detail="Token has expired or is invalid")
    if decoded["exp"] > time.time():
        return decoded
    else:
        logging.warn("token expired")
        raise HTTPException(status_code=401, detail="Token has expired or is invalid")
