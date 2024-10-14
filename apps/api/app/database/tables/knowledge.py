from __future__ import annotations
from dataclasses import dataclass
from datetime import datetime

from sqlalchemy import (
    UUID,
    Column,
    Enum,
    ForeignKey,
    Integer,
    Text,
    UniqueConstraint,
    text,
)
from sqlalchemy.dialects.postgresql import TIMESTAMP
from sqlalchemy.orm import relationship, Mapped

from app.database.session import Base

from typing import TYPE_CHECKING, List, Optional

from app.models.enums import JobStatus, KnowledgeType

if TYPE_CHECKING:
    from .user import User
    from .voice_assistant import VoiceAssistant


@dataclass
class Knowledge(Base):
    __tablename__ = "knowledge"

    id: int = Column(
        Integer,
        autoincrement=True,
        primary_key=True,
        nullable=False,
        unique=True,
        server_default=text("nextval('\"knowledge_id_seq\"'::regclass)"),
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
    updatedAt: datetime = Column(
        TIMESTAMP(precision=3), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
    type: KnowledgeType = Column(
        Enum(KnowledgeType, name="KnowledgeType"), nullable=False
    )
    url: Optional[str] = Column(Text, nullable=True)
    gcloud_bucket: Optional[str] = Column(Text, nullable=True)
    gcloud_name: Optional[str] = Column(Text, nullable=True)
    display_name: Optional[str] = Column(Text, nullable=True)

    status: JobStatus = Column(Enum(JobStatus, name="JobStatus"), nullable=True)
    error: Optional[str] = Column(Text, nullable=True)

    content: Optional[str] = Column(Text, nullable=True)

    user: Mapped[User] = relationship("User", back_populates="knowledge")
    voice_assistants: Mapped[List["VoiceAssistant"]] = relationship(
        "VoiceAssistant",
        secondary="assistants_to_knowledge",
        back_populates="knowledge",
    )
    __table_args__ = (UniqueConstraint("userUuid", "url", name="uq_useruuid_url"),)
