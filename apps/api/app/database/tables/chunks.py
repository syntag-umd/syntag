from __future__ import annotations
from dataclasses import dataclass
from datetime import datetime

from sqlalchemy import UUID, Column, ForeignKey, Integer, Text, text
from sqlalchemy.dialects.postgresql import TIMESTAMP
from sqlalchemy.orm import relationship, Mapped

from app.database.session import Base

from typing import TYPE_CHECKING, Literal

if TYPE_CHECKING:
    from .knowledge import Knowledge

SplitTypes = Literal["semantic", "tokens"]


@dataclass
class Chunk(Base):
    __tablename__ = "chunks"

    id: int = Column(
        Integer,
        autoincrement=True,
        primary_key=True,
        nullable=False,
        unique=True,
        server_default=text("nextval('\"chunk_id_seq\"'::regclass)"),
    )
    createdAt: datetime = Column(
        TIMESTAMP(precision=3), nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )

    knowledgeUuid: UUID = Column(
        ForeignKey("knowledge.uuid", ondelete="RESTRICT", onupdate="CASCADE"),
        nullable=False,
    )

    split_type: SplitTypes = Column(Text, nullable=True)
    index: int = Column(Integer, nullable=True)  # the index of the chunk

    # to get the chunk in python, do content[content_start_index:content_last_index + 1]
    content_start_index: int = Column(Integer, nullable=True)
    content_last_index: int = Column(Integer, nullable=True)

    # the id for the embedding of a chunk are knowledge_uuid#chunk_id

    knowledge: Mapped[Knowledge] = relationship("Knowledge")
