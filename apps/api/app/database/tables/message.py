from __future__ import annotations
from dataclasses import dataclass
from datetime import datetime
from typing import Union

from sqlalchemy import UUID, Column, Enum, ForeignKey, Integer, Text, func, select, text
from sqlalchemy.dialects.postgresql import TIMESTAMP
from sqlalchemy.orm import Session, relationship, Mapped

from app.database.session import Base
from app.models.enums import Role
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .conversation import Conversation


@dataclass
class Message(Base):
    __tablename__ = "message"

    id: int = Column(
        Integer,
        autoincrement=True,
        primary_key=True,
        nullable=False,
        unique=True,
        server_default=text("nextval('\"message_id_seq\"'::regclass)"),
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
    createdAt: datetime = Column(
        TIMESTAMP(precision=3), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
    updatedAt: datetime = Column(
        TIMESTAMP(precision=3), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
    role: Role = Column(Enum(Role, name="Role"), nullable=False)
    content: str = Column(Text, nullable=False)
    conversationUuid: UUID = Column(
        ForeignKey("conversation.uuid", ondelete="CASCADE", onupdate="CASCADE"),
        nullable=False,
    )
    tokenCount: int = Column(Integer, nullable=False)

    index: int = Column(Integer, nullable=True)

    conversation: Mapped[Conversation] = relationship(
        "Conversation", back_populates="messages"
    )
    user = relationship("User", back_populates="messages")


def create_message(
    db: Session,
    conversation_uuid: str,
    user_uuid: str,
    content: str,
    role: str,
    token_count: int,
    creation_time: datetime = None,
    current_highest_index: Union[int, None] = None,
):
    role_enum = Role.from_string(role)
    if current_highest_index is None:
        select_current_highest = select(
            func.coalesce(func.max(Message.index), -1)
        ).where(Message.conversationUuid == conversation_uuid)
        current_highest_index = db.execute(select_current_highest).scalar_one()

    highest_index = current_highest_index + 1

    data = Message(
        role=role_enum,
        content=content,
        conversationUuid=conversation_uuid,
        userUuid=user_uuid,
        tokenCount=token_count,
        createdAt=creation_time or datetime.now(),
        index=highest_index,
    )
    return data


def add_message_to_conversation(
    db: Session,
    conversation_uuid: str,
    user_uuid: str,
    content: str,
    role: str,
    token_count: int,
    creation_time: datetime = None,
    current_highest_index: Union[int, None] = None,
):
    data = create_message(
        db,
        conversation_uuid,
        user_uuid,
        content,
        role,
        token_count,
        creation_time,
        current_highest_index,
    )

    db.add(data)

    db.flush()

    return data
