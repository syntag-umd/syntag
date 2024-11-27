from __future__ import annotations
from dataclasses import dataclass
from datetime import datetime

from sqlalchemy import UUID, Column, ForeignKey, Integer, Text, text
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMP
from sqlalchemy.orm import relationship, Mapped

from app.database.session import Base

from typing import TYPE_CHECKING, Any, Dict, List, Literal, Optional, TypedDict, Union

from app.services.vapi.generated_models import Assistant


if TYPE_CHECKING:
    from .phone_number import PhoneNumber
    from .user import User
    from .knowledge import Knowledge
    from .conversation import Conversation


class PromptComponents(TypedDict):
    websiteSummary: Optional[str]
    instructions: Optional[str]
    knowledge: Optional[str]
    emotionTags: Optional[Any]


class SquireAgentConfig(TypedDict):
    type: Literal["squire"]
    shop_name: str


AgentConfig = Union[SquireAgentConfig, Dict[str, None]]


@dataclass
class VoiceAssistant(Base):
    __tablename__ = "voice_assistant"

    id: int = Column(
        Integer,
        autoincrement=True,
        primary_key=True,
        nullable=False,
        unique=True,
        server_default=text("nextval('\"voice_assistant_id_seq\"'::regclass)"),
    )
    uuid: UUID = Column(
        UUID,
        nullable=False,
        unique=True,
        server_default=text("gen_random_uuid()"),
        index=True,
    )
    userUuid: UUID = Column(
        ForeignKey("user.uuid", ondelete="RESTRICT", onupdate="CASCADE"), nullable=False
    )
    createdAt: datetime = Column(
        TIMESTAMP(precision=3), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )

    voice_enum: str = Column(Text, nullable=True)

    vapi_assistant_id: str = Column(Text, nullable=True)
    conversation_duration_sum: int = Column(
        Integer, nullable=False, server_default=text("0")
    )

    name: str = Column(Text, nullable=True)

    user: Mapped[User] = relationship("User", back_populates="voice_assistants")
    phone_number: Mapped[PhoneNumber | None] = relationship(
        "PhoneNumber", back_populates="voice_assistant", uselist=False
    )
    conversations: Mapped[List[Conversation]] = relationship(
        "Conversation", back_populates="voice_assistant", uselist=True
    )
    knowledge: Mapped[List["Knowledge"]] = relationship(
        "Knowledge",
        back_populates="voice_assistants",
        secondary="assistants_to_knowledge",
    )

    prompt_components: PromptComponents = Column(
        JSONB(astext_type=Text()), server_default=text("'{}'::jsonb"), nullable=False
    )

    vapi_config: Assistant = Column(
        JSONB(astext_type=Text()), server_default=text("'{}'::jsonb"), nullable=True
    )

    agent_config: AgentConfig = Column(
        JSONB(astext_type=Text()), server_default=text("'{}'::jsonb"), nullable=False
    )
