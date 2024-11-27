from dataclasses import dataclass
from datetime import datetime
from typing import Optional

from sqlalchemy import UUID, Column, Integer, Text, text, Float
from sqlalchemy.dialects.postgresql import TIMESTAMP
from sqlalchemy.orm import relationship

from app.database.session import Base


@dataclass
class User(Base):
    __tablename__ = "user"

    id: int = Column(
        Integer,
        autoincrement=True,
        primary_key=True,
        nullable=False,
        unique=True,
        server_default=text("nextval('\"user_id_seq\"'::regclass)"),
    )
    uuid: UUID = Column(
        UUID,
        nullable=False,
        unique=True,
        server_default=text("gen_random_uuid()"),
        index=True,
    )
    createdAt: datetime = Column(
        TIMESTAMP(precision=3), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
    updatedAt: datetime = Column(
        TIMESTAMP(precision=3), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
    name: str = Column(Text, nullable=False)
    email: str = Column(Text, nullable=True)
    pn: str = Column(Text, nullable=True)
    api_key: str = Column(Text, nullable=False)
    stripe_customer_id: str = Column(Text, nullable=True)
    clerk_id: str = Column(Text, nullable=True, unique=True)
    onboarding_stage: int = Column(Integer, nullable=True, server_default=text("0"))
    embedding_tokens: int = Column(Integer, nullable=False, server_default=text("0"))
    phone_number_balance: int = Column(
        Integer, nullable=False, server_default=text("0")
    )
    account_balance: float = Column(Float, nullable=False, server_default=text("0"))

    account_balance_recharge_threshold: Optional[float] = Column(Float, nullable=True)
    account_balance_recharge_to: Optional[float] = Column(Float, nullable=True)
    account_balance_payment_method: Optional[str] = Column(Text, nullable=True)

    conversations = relationship("Conversation", back_populates="user")
    messages = relationship("Message", back_populates="user")
    voice_assistants = relationship("VoiceAssistant", back_populates="user")
    phone_numbers = relationship("PhoneNumber", back_populates="user")
    knowledge = relationship("Knowledge", back_populates="user")
    journal_entries = relationship("UserJournalEntry", back_populates="user")
