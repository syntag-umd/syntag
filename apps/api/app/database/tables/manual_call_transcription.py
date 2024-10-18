from __future__ import annotations
from dataclasses import dataclass
from datetime import datetime

from app.models.schemas import ManualCallTranscriptionContent

from sqlalchemy import UUID, Column, Integer, text, String, DateTime, Boolean
from sqlalchemy.dialects.postgresql import JSON

from app.database.session import Base


@dataclass
class ManualCallTranscription(Base):
    __tablename__ = 'manual_call_transcription'
    id: int = Column(Integer, primary_key=True, index=True)
    uuid: UUID = Column(UUID, nullable=False, unique=True, server_default=text("gen_random_uuid()"), index=True)
    call_sid: str = Column(String, index=True)
    recording_sid: str = Column(String)
    messages: ManualCallTranscriptionContent = Column(JSON)  # Store messages as JSON
    caller_phone_number: str = Column(String)
    called_phone_number: str = Column(String)
    timestamp: datetime = Column(DateTime, default=datetime.utcnow)
    voicemail: bool = Column(Boolean, default=False)
    recording_url: str = Column(String)
    call_duration_seconds: int = Column(Integer)
    appointment_booked: bool = Column(Boolean, default=False)
