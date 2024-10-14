import re
from app.database.tables.conversation import Conversation
from app.database.tables.user import User
from test.routes.test_vapi_server_url import test_server_url_endofcall
from test.stripe_fixtures import mocked_stripe_create_usage_record  # noqa: F401
from test.qstash_fixtures import mocked_qstash_client  # noqa: F401
from test.auth_fixtures import mocked_qstash_jwt_decode  # noqa: F401
from test.auth_fixtures import mocked_constant_time_compare  # noqa: F401
from test.openai_fixtures import mocked_openai_completions_create  # noqa: F401
import responses


@responses.activate
def test_billing_vapi_call(
    test_client,
    db_session,
    mocked_qstash_client,
    mocked_stripe_create_usage_record,
    mocked_qstash_jwt_decode,
    mocked_constant_time_compare,
    mocked_openai_completions_create,
):
    convo = test_server_url_endofcall(
        test_client,
        db_session,
        mocked_qstash_client,
        mocked_constant_time_compare,
        mocked_openai_completions_create,
    )

    user = db_session.query(User).filter(User.uuid == convo.userUuid).first()
    convo = (
        db_session.query(Conversation).filter(Conversation.uuid == convo.uuid).first()
    )

    responses.add(
        responses.GET,
        re.compile(r"https://api\.vapi\.ai/call/.*"),
        json={"cost": 1},
    )

    resp = test_client.post(
        "/billing/vapi-call",
        json={"userUuid": str(user.uuid), "conversationUuid": str(convo.uuid)},
    )

    assert resp.status_code == 200
