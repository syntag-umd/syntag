# returns id of vapi phone number
from typing import Optional

from fastapi.security import APIKeyHeader
import requests
from fastapi import HTTPException

from app.core.config import settings


def add_phone_number_to_vapi(vapi_assistant_id: Optional[str], phone_number: str):
    add_phone_body = {
        "twilioAccountSid": settings.TWILIO_ACCOUNT_SID,
        "twilioAuthToken": settings.TWILIO_AUTH_TOKEN,
        "twilioPhoneNumber": phone_number,
    }
    if vapi_assistant_id:
        add_phone_body["voiceAssistantId"] = vapi_assistant_id

    add_phone_res = requests.post(
        "https://api.vapi.ai/phone-number/import",
        json=add_phone_body,
        headers={"Authorization": f"Bearer {settings.VAPI_API_KEY}"},
    )
    if add_phone_res.status_code >= 400:
        raise HTTPException(
            status_code=add_phone_res.status_code, detail=add_phone_res.json()
        )
    phone_number_id = add_phone_res.json().get("id")
    return phone_number_id


vapi_secret_header = APIKeyHeader(
    name="X-VAPI-SECRET", auto_error=False, scheme_name="VapiSecretHeader"
)
