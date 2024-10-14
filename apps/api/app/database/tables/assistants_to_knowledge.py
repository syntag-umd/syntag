from sqlalchemy import UUID, Column, ForeignKey
from app.database.session import Base


class AssistantsToFiles(Base):
    __tablename__ = "assistants_to_knowledge"
    knowledge_uuid = Column(UUID, ForeignKey("knowledge.uuid"), primary_key=True)
    voice_assistant_uuid = Column(
        UUID, ForeignKey("voice_assistant.uuid"), primary_key=True
    )
