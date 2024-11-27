from typing import Annotated, TypeVar
from pydantic import BaseModel
from pydantic import WrapValidator
from typing import Any, Dict, List, Optional
from typing_extensions import TypedDict

def IgnoreValidationFunc(v, handler, info):
    """Allows you to use TypedDict and skip run time validation for fastAPI body"""
    return v

T = TypeVar("T")
IgnoreValidation = Annotated[T, WrapValidator(IgnoreValidationFunc)]


class Parameters(BaseModel):
    type: str
    properties: Dict[str, Any]


class Function(BaseModel):
    name: str
    description: str
    parameters: Optional[Parameters] = None


class Tool(BaseModel):
    type: str
    function: Function

class Customer(BaseModel):
    number: str

class Message(TypedDict):
    role: str
    content: str  # assistant with tool_calls is blank
    tool_calls: Optional[List[Any]]

class Call(BaseModel):
    id: str
    orgId: str
    createdAt: str
    updatedAt: str
    type: str
    status: str
    assistantId: str
    customer: Optional[Customer] = None
    phoneNumberId: Optional[str] = None
    phoneCallProvider: Optional[str] = None
    phoneCallProviderId: Optional[str] = None
    phoneCallTransport: Optional[str] = None


class PhoneNumber(BaseModel):
    id: str
    orgId: str
    number: str
    createdAt: str
    updatedAt: str
    twilioAccountSid: str
    twilioAuthToken: str
    name: Optional[str] = None
    provider: str

class ChatCallRequest(BaseModel):
    model: str
    messages: IgnoreValidation[List[Message]]
    temperature: float
    tools: Optional[List[Tool]] = None
    stream: bool
    max_tokens: int
    call: Call
    phoneNumber: Optional[PhoneNumber] = None
    customer: Optional[Customer] = None
    metadata: Dict[str, Any]
