from __future__ import annotations
from dataclasses import dataclass
from datetime import datetime

from sqlalchemy import UUID, Column, Float, ForeignKey, Integer, Text, text
from sqlalchemy.dialects.postgresql import JSONB, TIMESTAMP
from sqlalchemy.orm import relationship, Mapped

from app.database.session import Base

from typing import TYPE_CHECKING, Literal, Optional, Union
from typing_extensions import TypedDict

if TYPE_CHECKING:
    from .user import User

transaction_types = Literal["call", "account_balance"]


class CallEntry(TypedDict):
    vapiCallId: str
    conversationUuid: str


class AccountBalanceEntry(TypedDict):
    event_id: str
    checkout_session_id: Optional[str]
    invoice_id: Optional[str]


@dataclass
class UserJournalEntry(Base):
    __tablename__ = "user_journal_entry"

    id: int = Column(
        Integer,
        autoincrement=True,
        primary_key=True,
        nullable=False,
        unique=True,
        server_default=text("nextval('\"user_journal_entry_id_seq\"'::regclass)"),
    )

    uuid: UUID = Column(
        UUID,
        nullable=False,
        unique=True,
        server_default=text("gen_random_uuid()"),
        index=True,
    )

    # positive increased account_balance, negative decreased account_balance
    # in dollars
    amount = Column(Float, nullable=True)

    userUuid: UUID = Column(
        ForeignKey("user.uuid", ondelete="SET NULL", onupdate="CASCADE"), nullable=True
    )

    createdAt: datetime = Column(
        TIMESTAMP(precision=3), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )

    type: transaction_types = Column(Text, nullable=True)

    type_data: Union[CallEntry, AccountBalanceEntry] = Column(
        JSONB(astext_type=Text()), server_default=text("'{}'::jsonb"), nullable=True
    )

    user: Mapped[User] = relationship("User", back_populates="journal_entries")
