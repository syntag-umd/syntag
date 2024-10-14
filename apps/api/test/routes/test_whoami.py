import time
from app.database.tables.user import User
from test.auth_fixtures import mocked_jwt_decode, decoded_jwt  # noqa: F401


def test_whoami_jwt(test_client, db_session, mocked_jwt_decode):
    user = User(
        uuid=decoded_jwt["external_id"],
        api_key="api_key",
        name="test",
    )
    db_session.add(user)
    db_session.commit()

    resp = test_client.get(
        "/whoami",
        headers={"X-CLERK-JWT": "any"},
    )
    assert resp.status_code == 200
    response_json = resp.json()
    assert response_json == {"user_uuid": decoded_jwt["external_id"]}


def test_whoami_api_key_header(test_client, db_session):
    user = User(
        uuid=decoded_jwt["external_id"],
        api_key="api_key",
        name="test",
    )
    db_session.add(user)
    db_session.commit()

    resp = test_client.get(
        "/whoami",
        headers={"X-API-KEY": "api_key"},
    )
    assert resp.status_code == 200
    response_json = resp.json()
    assert response_json == {"user_uuid": decoded_jwt["external_id"]}


def test_whoami_api_key_query(test_client, db_session):
    print(time.time())
    user = User(
        uuid=decoded_jwt["external_id"],
        api_key="api_key",
        name="test",
    )
    db_session.add(user)
    db_session.commit()

    resp = test_client.get(
        "/whoami?api_key=api_key",
    )
    assert resp.status_code == 200
    response_json = resp.json()
    assert response_json == {"user_uuid": decoded_jwt["external_id"]}
