from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from app.core.config import settings
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
from app.instrumentation import global_tracer

# Create a synchronous engine
engine = create_engine(settings.DATABASE_URL, max_overflow=5, pool_size=3)
SQLAlchemyInstrumentor().instrument(engine=engine, tracer_provider=global_tracer)

isolation_engine = engine.execution_options(isolation_level="SERIALIZABLE")

# Configure the sessionmaker to use the engine
db_session = sessionmaker(autocommit=False, autoflush=False, bind=engine)

isolation_session = sessionmaker(
    autocommit=False, autoflush=False, bind=isolation_engine
)

Base = declarative_base()

# Define a function to get a database session


def get_db():
    # Using the sessionmaker instance to get a session
    session = db_session()
    try:
        yield session
    finally:
        session.close()  # Ensure the session is closed properly


def get_isolated_db():
    session = isolation_session()
    try:
        yield session
    finally:
        session.close()


# Import your table definitions; ensure they are compatible with the
# synchronous approach
from app.database.tables import (  # noqa: F401, E402
    message,
    conversation,
    user,
    voice_assistant,
    phone_number,
    knowledge,
    assistants_to_knowledge,
    chunks,
    user_journal_entry,
    manual_call_transcription
)
