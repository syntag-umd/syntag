import logging
import pytest
from fastapi.testclient import TestClient
from pytest_postgresql import factories
from pytest_postgresql.janitor import DatabaseJanitor
from sqlalchemy import create_engine
from sqlalchemy.orm.session import sessionmaker
from app.database.session import Base
from app.main import create_app


logging.basicConfig()
logger = logging.getLogger()
logger.setLevel(logging.DEBUG)

test_db = factories.postgresql_proc(port=None, dbname="test_db")


@pytest.fixture(scope="function")
def db_session(test_db, monkeypatch):
    """Session for SQLAlchemy."""
    pg_host = test_db.host
    pg_port = test_db.port
    pg_user = test_db.user
    pg_password = test_db.password
    pg_db = test_db.dbname

    with DatabaseJanitor(
        user=pg_user,
        host=pg_host,
        port=pg_port,
        dbname=pg_db,
        version=test_db.version,
        password=pg_password,
    ):
        connection_str = f"postgresql+psycopg2://{pg_user}:@{pg_host}:{pg_port}/{pg_db}"
        engine = create_engine(connection_str)
        Base.metadata.create_all(engine)
        session_maker = sessionmaker(bind=engine, expire_on_commit=False)

        isolation_engine = engine.execution_options(isolation_level="SERIALIZABLE")
        isolation_session = sessionmaker(bind=isolation_engine)

        monkeypatch.setattr("app.database.session.db_session", session_maker)
        monkeypatch.setattr("app.database.session.isolation_session", isolation_session)

        # make and yield session, close after
        yield session_maker()
        isolation_session.close_all()


@pytest.fixture
def test_client(app):
    # Create a test client for the FastAPI application
    return TestClient(app)


@pytest.fixture
def app():

    # Create a FastAPI application for testing
    return create_app()
