from __future__ import annotations
from dataclasses import dataclass
from datetime import datetime
from sqlalchemy import UUID, Column, ForeignKey, Integer, Text, text
from sqlalchemy.dialects.postgresql import TIMESTAMP
from sqlalchemy.orm import relationship, Mapped

from app.database.session import Base

from typing import TYPE_CHECKING, Optional

if TYPE_CHECKING:
    from .voice_assistant import VoiceAssistant
    from .user import User


@dataclass
class PhoneNumber(Base):
    __tablename__ = "phone_number"

    id: int = Column(
        Integer,
        autoincrement=True,
        primary_key=True,
        nullable=False,
        unique=True,
        server_default=text("nextval('\"phone_number_id_seq\"'::regclass)"),
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
    voice_assistant_uuid: UUID = Column(
        ForeignKey("voice_assistant.uuid", ondelete="RESTRICT", onupdate="CASCADE"),
        nullable=True,
    )

    createdAt: datetime = Column(
        TIMESTAMP(precision=3), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )

    pn: Optional[str] = Column(Text, nullable=True)
    vapi_phone_number_id: Optional[str] = Column(Text, nullable=True)
    stripe_subscription_item_id: Optional[str] = Column(Text, nullable=True)

    user: Mapped[User] = relationship("User", back_populates="phone_numbers")
    voice_assistant: Mapped[VoiceAssistant] = relationship(
        "VoiceAssistant", back_populates="phone_number", uselist=False
    )
