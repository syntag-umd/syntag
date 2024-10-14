from typing import Union
from .generated_models import *  # noqa: F403, F401
from .generated_models import (
    Call,
    ServerMessage as ServerMessageOld,
    ServerMessageEndOfCallReport as ServerMessageEndOfCallReportOld,
    ServerMessageStatusUpdate,
    ServerMessageAssistantRequest,
    ServerMessageConversationUpdate,
    ServerMessageHang,
    ServerMessageModelOutput,
    ServerMessagePhoneCallControl,
    ServerMessageSpeechUpdate,
    ServerMessageToolCalls,
    ServerMessageTransferDestinationRequest,
    ServerMessageTranscript,
    ServerMessageUserInterrupted,
    ServerMessageVoiceInput,
)


class ServerMessageEndOfCallReport(ServerMessageEndOfCallReportOld):
    call: Call


class ServerMessage(ServerMessageOld):
    message: Union[
        ServerMessageEndOfCallReport,
        ServerMessageStatusUpdate,
        ServerMessageAssistantRequest,
        ServerMessageConversationUpdate,
        ServerMessageHang,
        ServerMessageModelOutput,
        ServerMessagePhoneCallControl,
        ServerMessageSpeechUpdate,
        ServerMessageToolCalls,
        ServerMessageTransferDestinationRequest,
        ServerMessageTranscript,
        ServerMessageUserInterrupted,
        ServerMessageVoiceInput,
    ]


# __all__ = [name for name in globals() if not name.startswith("_")]
