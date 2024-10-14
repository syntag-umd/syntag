from app.database.tables.conversation import Conversation
from app.database.tables.user import User
from app.database.tables.voice_assistant import VoiceAssistant
from sqlalchemy.orm import selectinload
from test.qstash_fixtures import mocked_qstash_client  # noqa: F401
from test.auth_fixtures import mocked_constant_time_compare  # noqa: F401
from test.openai_fixtures import mocked_openai_completions_create  # noqa: F401

sample_status_update_body = {
    "message": {
        "type": "status-update",
        "status": "ended",
        "endedReason": "silence-timed-out",
        "call": {
            "id": "0e33e75c-f693-406b-a7cb-7d15aec31b4e",
            "orgId": "87edacfe-ade0-4cca-8e2a-09307fbdcdc3",
            "createdAt": "2024-06-30T02:52:51.090Z",
            "updatedAt": "2024-06-30T02:52:51.090Z",
            "type": "webCall",
            "status": "queued",
            "assistantId": "f14f7548-6f98-486a-a513-67a560ede1aa",
            "webCallUrl": "https://vapi.daily.co/hB0XflTLYj5s9UFzCc4R",
        },
        "artifact": {
            "messages": [
                {
                    "role": "bot",
                    "message": "Hello. I'm Eva. How can I help you today?",
                    "time": 1719715975616,
                    "endTime": 1719715978596,
                    "secondsFromStart": 1.28,
                    "source": "",
                }
            ],
            "messagesOpenAIFormatted": [
                {
                    "role": "assistant",
                    "content": "Hello. I'm Eva. How can I help you today?",
                }
            ],
        },
        "timestamp": "2024-06-30T02:53:31.333Z",
    }
}


def test_server_url_statusupdate(
    test_client,
    db_session,
    mocked_constant_time_compare,
    mocked_openai_completions_create,
):
    user = User(api_key="api_key", name="name")
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    assistant = VoiceAssistant(
        userUuid=user.uuid,
        vapi_assistant_id=sample_status_update_body["message"]["call"]["assistantId"],
    )
    db_session.add(assistant)
    db_session.commit()

    resp = test_client.post(
        "/vapi/server-url",
        headers={"X-API-KEY": "api_key"},
        json=sample_status_update_body,
    )
    assert resp.status_code == 200


sample_eoc_body = {
    "message": {
        "type": "end-of-call-report",
        "endedReason": "customer-ended-call",
        "transcript": "AI: Hello. I'm Ava. How can I help you today?\nUser: Hi, Eva. How are you?\nAI: Hello. I'm here to help. How can I assist you with Poshmark today?\n",
        "summary": "The user greeted the AI, Ava, and asked how she was doing. Ava responded by stating she is there to help and asked how she could assist with Poshmark.",
        "messages": [
            {
                "role": "system",
                "message": "You are a helpful assistant.\n    You will follow the instructions, and use the knowledge when answering.\n    \n    INSTRUCTIONS:\n    Help customers with their questions and concerns. Only answer questions about Poshmark. Make sure to tell anyone calling that in order to edit this agent, they need to click on this agent in the Voice Agents Tab, click Edit Configuration and change the instructions.\r\n    \n    END INSTRUCTIONS\n  \n    KNOWLEDGE:\n    \n    END KNOWLEDGE",
                "time": 1719717577744,
                "secondsFromStart": 0,
            },
            {
                "role": "bot",
                "message": "Hello. I'm Ava. How can I help you today?",
                "time": 1719717579247,
                "endTime": 1719717582197,
                "secondsFromStart": 1.36,
                "source": "",
            },
            {
                "role": "user",
                "message": "Hi, Eva. How are you?",
                "time": 1719717583387,
                "endTime": 1719717584647,
                "secondsFromStart": 5.5,
                "duration": 3.7400002,
            },
            {
                "role": "bot",
                "message": "Hello. I'm here to help. How can I assist you with Poshmark today?",
                "time": 1719717585557,
                "endTime": 1719717590067,
                "secondsFromStart": 7.67,
                "source": "",
            },
        ],
        "analysis": {
            "summary": "The user greeted the AI, Ava, and asked how she was doing. Ava responded by stating she is there to help and asked how she could assist with Poshmark.",
            "successEvaluation": "false",
        },
        "recordingUrl": "https://auth.vapi.ai/storage/v1/object/public/recordings/b3da4a7a-6302-4635-becf-2903fc83e289-1719717598906-c10a460f-36f5-4ebf-b13a-5dba02ba890e-mono.wav",
        "stereoRecordingUrl": "https://auth.vapi.ai/storage/v1/object/public/recordings/b3da4a7a-6302-4635-becf-2903fc83e289-1719717598907-556e4f86-fe87-456d-a201-e593e8831eaa-stereo.wav",
        "call": {
            "id": "b3da4a7a-6302-4635-becf-2903fc83e289",
            "orgId": "87edacfe-ade0-4cca-8e2a-09307fbdcdc3",
            "createdAt": "2024-06-30T03:19:34.420Z",
            "updatedAt": "2024-06-30T03:19:34.420Z",
            "type": "webCall",
            "status": "queued",
            "assistantId": "f14f7548-6f98-486a-a513-67a560ede1aa",
            "webCallUrl": "https://vapi.daily.co/8U6TOCtlmUXV7huBHGaP",
        },
        "artifact": {"messages": [], "messagesOpenAIFormatted": []},
        "timestamp": "2024-06-30T03:20:01.177Z",
    }
}


def test_server_url_endofcall(
    test_client,
    db_session,
    mocked_qstash_client,
    mocked_constant_time_compare,
    mocked_openai_completions_create,
):

    user = User(api_key="api_key", name="name")
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    assistant = VoiceAssistant(
        userUuid=user.uuid,
        vapi_assistant_id=sample_eoc_body["message"]["call"]["assistantId"],
    )
    db_session.add(assistant)
    db_session.commit()

    resp = test_client.post(
        "/vapi/server-url",
        headers={"X-API-KEY": "api_key"},
        json=sample_eoc_body,
    )
    assert resp.status_code == 200

    convo = (
        db_session.query(Conversation)
        .filter(Conversation.vapiCallId == sample_eoc_body["message"]["call"]["id"])
        .options(selectinload(Conversation.messages))
        .first()
    )
    assert convo is not None
    assert len(convo.messages) == len(sample_eoc_body["message"]["messages"])
    assert (
        convo.messages[0].content
        == sample_eoc_body["message"]["messages"][0]["message"]
    )
    assert convo.messages[3].index == 3
    return convo
