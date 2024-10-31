# Testing the OpenAI client

# Path: test/services/test_openai_client.py

from test.openai_fixtures import (  # noqa: F401
    openai_completion_side_effect,
    mocked_openai_completions_create,
)

import pytest

from app.models.enums import Role
from app.models.schemas import Message
from app.services.llm_client import OpenAIClient


@pytest.fixture
def openai_client():
    return OpenAIClient(api_key="fake_key")


def test_single_response(mocked_openai_completions_create, openai_client):

    mocked_openai_completions_create.side_effect = openai_completion_side_effect

    with pytest.raises(AssertionError) as e:
        openai_client.single_response(123)

    assert str(e.value) == "prompt must be a string"

    prompt = "Hello"

    response = openai_client.single_response(prompt)

    assert response == "Hi, how can I help you?"


def test_server_and_user_message_response(
    mocked_openai_completions_create, openai_client
):

    mocked_openai_completions_create.side_effect = openai_completion_side_effect

    with pytest.raises(AssertionError) as e:
        openai_client.server_and_user_message_response(123, "Hello")

    assert str(e.value) == "server_prompt must be a string"

    with pytest.raises(AssertionError) as e:
        openai_client.server_and_user_message_response("Hello", 123)

    assert str(e.value) == "user_prompt must be a string"

    server_prompt = "Hello"
    user_prompt = "Hi"

    response = openai_client.server_and_user_message_response(
        server_prompt, user_prompt
    )

    assert response == "Hi, how can I help you?"


def test_conversation_response(mocked_openai_completions_create, openai_client):

    mocked_openai_completions_create.side_effect = openai_completion_side_effect

    messages = [
        Message(role=Role.USER, content="Hello"),
        Message(role=Role.SYSTEM, content="Hi"),
    ]

    response = openai_client.conversation_response(messages)

    assert response == "Hi, how can I help you?"

    messages = [
        Message(role=Role.USER, content="Hello"),
        Message(role=Role.SYSTEM, content="Hi"),
        Message(role=Role.USER, content="I need help"),
    ]

    response = openai_client.conversation_response(messages)

    assert response == "Hi, how can I help you?"

    messages = [
        Message(role=Role.USER, content="Hello"),
        {"role": "SYSTEM", "content": "Hi"},
    ]

    with pytest.raises(AssertionError) as e:
        openai_client.conversation_response(messages)

    assert str(e.value) == "messages must be a list of Message objects"


def test_single_response_stream(mocked_openai_completions_create, openai_client):

    mocked_openai_completions_create.side_effect = openai_completion_side_effect

    with pytest.raises(AssertionError) as e:
        stream = openai_client.single_response_stream(123)
        next(stream)

    assert str(e.value) == "prompt must be a string"

    prompt = "Hello"

    stream = openai_client.single_response_stream(prompt)

    assert next(stream) == "Hi,"
    assert next(stream) == " how"
    assert next(stream) == " can"
    assert next(stream) == " I"
    assert next(stream) == " help"
    assert next(stream) == " you?"
    with pytest.raises(StopIteration):
        next(stream)


def test_server_and_user_message_response_stream(
    mocked_openai_completions_create, openai_client
):

    mocked_openai_completions_create.side_effect = openai_completion_side_effect

    with pytest.raises(AssertionError) as e:
        stream = openai_client.server_and_user_message_response_stream(123, "Hello")
        next(stream)

    assert str(e.value) == "server_prompt must be a string"

    with pytest.raises(AssertionError) as e:
        stream = openai_client.server_and_user_message_response_stream("Hello", 123)
        next(stream)

    assert str(e.value) == "user_prompt must be a string"

    server_prompt = "Hello"
    user_prompt = "Hi"

    stream = openai_client.server_and_user_message_response_stream(
        server_prompt, user_prompt
    )

    assert next(stream) == "Hi,"
    assert next(stream) == " how"
    assert next(stream) == " can"
    assert next(stream) == " I"
    assert next(stream) == " help"
    assert next(stream) == " you?"
    with pytest.raises(StopIteration):
        next(stream)


# def conversation_response_stream(self, messages: list):

#         formatted_messages = OpenAIClient.convert_messages_to_openai_format(messages)

#         # Initiates the stream and specifies a callback function to handle the stream's output
#         stream = openai.chat.completions.create(
#             model=self.model,
#             messages=formatted_messages,
#             temperature=self.temperature,
#             max_tokens=self.max_tokens,
#             stream=True
#         )

#         for response in stream:
#             message_content = response.choices[0].delta.content
#             if message_content:
#                 yield message_content


def test_conversation_response_stream(mocked_openai_completions_create, openai_client):

    mocked_openai_completions_create.side_effect = openai_completion_side_effect

    messages = [
        Message(role=Role.USER, content="Hello"),
        Message(role=Role.SYSTEM, content="Hi"),
    ]

    stream = openai_client.conversation_response_stream(messages)

    assert next(stream) == "Hi,"
    assert next(stream) == " how"
    assert next(stream) == " can"
    assert next(stream) == " I"
    assert next(stream) == " help"
    assert next(stream) == " you?"
    with pytest.raises(StopIteration):
        next(stream)

    messages = [
        Message(role=Role.USER, content="Hello"),
        Message(role=Role.SYSTEM, content="Hi"),
        Message(role=Role.USER, content="I need help"),
    ]

    stream = openai_client.conversation_response_stream(messages)

    assert next(stream) == "Hi,"
    assert next(stream) == " how"
    assert next(stream) == " can"
    assert next(stream) == " I"
    assert next(stream) == " help"
    assert next(stream) == " you?"
    with pytest.raises(StopIteration):
        next(stream)

    messages = [
        Message(role=Role.USER, content="Hello"),
        {"role": "SYSTEM", "content": "Hi"},
    ]

    with pytest.raises(AssertionError) as e:
        stream = openai_client.conversation_response_stream(messages)
        next(stream)

    assert str(e.value) == "messages must be a list of Message objects"
