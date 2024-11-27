from dataclasses import fields
from datetime import datetime
from typing import Any, Dict, List, Literal, Optional
import uuid
from pydantic import UUID4, BaseModel, ConfigDict, Field, model_validator, EmailStr

from app.models.enums import (
    Role,
)


class Omitted(BaseModel):
    def __bool__(self) -> Literal[False]:
        return False

    def __repr__(self) -> str:
        return "OMITTED_STR"


OMITTED = Omitted()


class Message(BaseModel):
    role: Role
    content: str

    model_config = ConfigDict(extra="forbid")


class ConversationModel(BaseModel):
    messages: List[Message]


class Assistant(BaseModel):
    id: str = Field(..., alias="id")
    object: str
    created_at: int
    name: str
    description: Optional[str] = None
    model: str
    instructions: str
    tools: List[Any]
    file_ids: List[str]
    metadata: Dict[str, Any]


class VapiConversationMessage(BaseModel):
    message: object


class VapiConversationResponse(BaseModel):
    response: str


class Voice(BaseModel):
    provider: str
    voiceId: str


class GetVapiConfigResponse(BaseModel):
    endCallMessage: Optional[str]
    fillersEnabled: Optional[bool]
    firstMessage: Optional[str]
    language: str
    responseDelaySeconds: float
    serverUrl: str
    silenceTimeoutSeconds: int
    serverMessages: List[str]
    voice: Voice


def parse_sqlalchemy(cls, data):
    valid_fields = list(cls.model_fields.keys())
    d = dict()
    for f in fields(data):
        cls.model_fields
        if f.name in valid_fields:
            value = getattr(data, f.name)
            if isinstance(value, uuid.UUID):
                d[f.name] = str(value)
            else:
                d[f.name] = getattr(data, f.name)
    return d


class VoiceAssistantDict(BaseModel):
    uuid: str
    userUuid: str
    createdAt: datetime
    profile_pic_url: Optional[str]
    chatgpt_assistant_id: Optional[str]
    vapi_assistant_id: Optional[str]
    name: Optional[str]

    @model_validator(mode="before")
    @classmethod
    def parse(cls, data):
        return parse_sqlalchemy(cls, data)


class WhoamiResponse(BaseModel):
    user_uuid: str


class BillingVapiCallBody(BaseModel):
    """Either vapiCallId or conversationUuid must be provided"""

    userUuid: UUID4
    conversationUuid: Optional[UUID4] = None
    vapiCallId: Optional[str] = None

    @model_validator(mode="after")
    def hasId(self):
        if not self.vapiCallId and not self.conversationUuid:
            raise ValueError("Either vapiCallId or conversationUuid must be provided")
        return self


class AppointmentBookingRequest(BaseModel):
    barberOrderIndex: int
    serviceName: str
    day: str
    time: str
    firstName: str
    lastName: str
    email: EmailStr
    phoneNumber: str


class ManualCallTranscriptionMessage(BaseModel):
    role: Literal["receptionist", "customer"]
    content: str

class ManualCallTranscriptionContent(BaseModel):
    messages: List[ManualCallTranscriptionMessage]
    