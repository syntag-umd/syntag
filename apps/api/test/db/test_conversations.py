from app.database.tables.conversation import Conversation
from app.database.tables.message import add_message_to_conversation
from app.database.tables.user import User
from app.models.enums import ChatMedium, Language, Role
import app.database.session as sessions


def test_convo_messages(test_client, db_session):
    db_session = sessions.db_session()
    new_user = User(api_key="api_key", name="test")
    db_session.add(new_user)
    db_session.commit()
    db_session.refresh(new_user)

    new_conversation = Conversation(
        userUuid=new_user.uuid,
        medium=ChatMedium.PHONE,
        language=Language.ENGLISH,
        tokenCount=0,
        assistantId="assistantId",
    )
    db_session.add(new_conversation)
    db_session.flush()
    db_session.commit()
    db_session.refresh(new_conversation)

    convo = (
        db_session.query(Conversation)
        .filter(Conversation.uuid == new_conversation.uuid)
        .first()
    )

    iso = sessions.isolation_session()
    convo_2 = (
        iso.query(Conversation)
        .filter(Conversation.uuid == new_conversation.uuid)
        .first()
    )
    assert convo == convo_2
    iso.close()

    message_1 = add_message_to_conversation(
        db_session,
        new_conversation.uuid,
        new_user.uuid,
        "MESSAGE 1",
        Role.SYSTEM,
        token_count=0,
    )
    assert message_1.index == 0

    message_2 = add_message_to_conversation(
        db_session,
        new_conversation.uuid,
        new_user.uuid,
        "MESSAGE 2",
        Role.USER,
        token_count=0,
        current_highest_index=0,
    )
    assert message_2.index == 1

    message_3 = add_message_to_conversation(
        db_session,
        new_conversation.uuid,
        new_user.uuid,
        "MESSAGE 2",
        Role.USER,
        token_count=0,
    )
    assert message_3.index == 2
