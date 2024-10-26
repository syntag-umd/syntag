from __future__ import annotations
from dataclasses import dataclass
from datetime import datetime
from typing import List, Optional
from typing_extensions import TypedDict

from sqlalchemy import UUID, Boolean, Column, Enum, ForeignKey, Integer, Text, text
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMP
from sqlalchemy.orm import relationship, Mapped

from app.database.session import Base
from app.models.enums import ChatMedium, Language
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .message import Message


class ConversationCache(TypedDict):
    previously_injected_chunk_ids: List[int]


@dataclass
class Conversation(Base):
    __tablename__ = "conversation"

    id: int = Column(
        Integer,
        autoincrement=True,
        primary_key=True,
        nullable=False,
        unique=True,
        server_default=text("nextval('\"conversation_id_seq\"'::regclass)"),
    )
    uuid: UUID = Column(
        UUID,
        nullable=False,
        unique=True,
        server_default=text("gen_random_uuid()"),
        index=True,
    )
    userUuid: UUID = Column(
        ForeignKey("user.uuid", ondelete="CASCADE", onupdate="CASCADE"), nullable=False
    )
    user = relationship("User", back_populates="conversations")

    createdAt: datetime = Column(
        TIMESTAMP(precision=3), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
    updatedAt: datetime = Column(
        TIMESTAMP(precision=3), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )

    medium: ChatMedium = Column(Enum(ChatMedium, name="Medium"), nullable=False)
    language: Language = Column(Enum(Language, name="Language"), nullable=False)
    tokenCount: int = Column(Integer, nullable=False, default=0)
    durationInSeconds: int = Column(Integer, nullable=False, server_default=text("0"))

    voice_assistant_uuid: Optional[UUID] = Column(
        ForeignKey("voice_assistant.uuid", ondelete="SET NULL", onupdate="CASCADE"),
        nullable=True,
    )
    voice_assistant = relationship("VoiceAssistant", back_populates="conversations")

    vapiCallId: str = Column(Text, nullable=True, unique=True)

    assistant_pn = Column(Text, nullable=True)
    caller_pn = Column(Text, nullable=True)
    summary: str = Column(Text, nullable=True)

    starred = Column(
        Boolean, server_default="false", nullable=False
    )  # has user starred the conversation
    viewed = Column(
        Boolean, server_default="false", nullable=False
    )  # has user viewed the conversation

    messages: Mapped[List[Message]] = relationship(
        "Message", back_populates="conversation"
    )

    cache: Optional[ConversationCache] = Column(
        JSONB(astext_type=Text()), nullable=True
    )
