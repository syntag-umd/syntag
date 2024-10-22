from enum import Enum
from typing import Literal


class Role(str, Enum):
    SYSTEM = "SYSTEM"
    USER = "USER"
    ASSISTANT = "ASSISTANT"
    TOOL = "TOOL"

    @classmethod
    def from_string(cls, role: str):
        role = role.upper()
        try:
            role_enum = cls(role)
        except ValueError:
            if role == "USER":
                role_enum = Role.USER
            elif role == "SYSTEM":
                role_enum = Role.SYSTEM
            elif role == "BOT" or role == "ASSISTANT":
                role_enum = Role.ASSISTANT
            elif role == "TOOL" or role == "FUNCTION":
                role_enum = Role.TOOL
            else:
                role_enum = Role.SYSTEM

        return role_enum


class KnowledgeType(str, Enum):
    WEBSITE = "WEBSITE"
    FILE = "FILE"


class JobStatus(str, Enum):
    ENQUEUE = "ENQUEUE"
    IN_PROGRESS = "IN_PROGRESS"
    READY = "READY"
    FAILED = "FAILED"


class FilePurpose(str, Enum):
    ASSISTANTS = "ASSISTANTS"
    FINE_TUNING = "FINE-TUNING"


class ChatMedium(str, Enum):
    PHONE = "PHONE"
    VOICECHAT = "VOICECHAT"  # webcall
    CHAT = "CHAT"


class Language(str, Enum):
    ENGLISH = "ENGLISH"
    SPANISH = "SPANISH"


class IssueResolutionType(str, Enum):
    UNRESOLVABLE = "UNRESOLVABLE"
    RESOLVABLE_VIA_TICKET = "RESOLVABLE_VIA_TICKET"
    AUTORESOLVABLE = "AUTORESOLVABLE"


class FieldType(str, Enum):
    STR = "STR"
    INT = "INT"
    FLOAT = "FLOAT"
    BOOL = "BOOL"
    DATE = "DATE"


DEFAULT_MODEL = "gpt-4o-mini"
DEFAULT_TOKEN_COUNT = (
    "gpt-4-turbo"  # in case the token count library does not have the newest model
)

# This is not extensive and really just for type hinting
PossibleOpenAIModels = Literal[
    "gpt-4o",
    "gpt-4o-mini",
    "gpt-4-turbo",
    "gpt-4-turbo-2024-04-09",
    "gpt-4-turbo-preview",
    "gpt-4-0125-preview",
    "gpt-4-1106-preview",
    "gpt-4-vision-preview",
    "gpt-4-1106-vision-preview",
    "gpt-4-0613",
    "gpt-4-32k",
    "gpt-4-32k-0613",
    "gpt-3.5-turbo-0125",
    "gpt-3.5-turbo",
    "gpt-3.5-turbo-1106",
    "gpt-3.5-turbo-instruct",
    "gpt-3.5-turbo-16k",
    "gpt-3.5-turbo-0613",
    "gpt-3.5-turbo-16k-0613",
]
