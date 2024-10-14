import time
from unittest.mock import Mock

import openai
import pytest

from app.models.enums import DEFAULT_MODEL, PossibleOpenAIModels, Role
from app.models.schemas import Assistant, Message
from app.services.openai_client import OpenAIClient
from typing import get_args

MOCKED_OPENAI_COMPLETIONS_RESPONSE = "Hi, how can I help you?"


@pytest.fixture
def mocked_openai_completions_create(mocker):
    # Mock the openai.chat.completions.create function
    openai.api_key = "fake_key"
    patched_completions_create = mocker.patch("openai.chat.completions.create")
    patched_completions_create.side_effect = openai_completion_side_effect
    return patched_completions_create


def openai_completion_side_effect(*arguments, **kwargs):

    # parse arguments and kwargs into a dict, arguments being a tuple and
    # kwargs being a dict

    args = {}
    ordered_args = ["model", "messages", "temperature", "max_tokens", "stream"]

    for idx, arg in enumerate(arguments):
        args[ordered_args[idx]] = arg

    for key, value in kwargs.items():
        args[key] = value

    if not ("messages" in args and "model" in args) and not (
        "messages" in args and "model" in args and "stream" in args
    ):
        raise TypeError(
            "Missing required arguments; Expected either ('messages' and 'model') or ('messages', 'model' and 'stream') arguments to be given"
        )

    model = args["model"]

    if model not in get_args(PossibleOpenAIModels):
        raise openai.NotFoundError(
            message="Error code: 404 - {'error': {'message': 'The model `{model}` does not exist or you do not have access to it.', 'type': 'invalid_request_error', 'param': None, 'code': 'model_not_found'}}".replace(
                "{model}", str(model)
            ),
            response=Mock(request=""),
            body={},
        )

    messages = args["messages"]

    if not isinstance(messages, list):
        raise openai.BadRequestError(
            message="Error code: 400 - {'error': {'message': \"'{messages}' is not of type 'array' - 'messages'\", 'type': 'invalid_request_error', 'param': None, 'code': None}}".replace(
                "{messages}", str(messages)
            ),
            response=Mock(request=""),
            body={},
        )

    for idx, message in enumerate(messages):
        if not isinstance(message, object):
            raise openai.BadRequestError(
                message="Error code: 400 - {'error': {'message': \"'{message}' is not of type 'object' - 'messages.{idx}'\", 'type': 'invalid_request_error', 'param': None, 'code': None}}".replace(
                    "{message}", str(message)
                ).replace(
                    "{idx}", str(idx)
                ),
                response=Mock(request=""),
                body={},
            )
        for key in message:
            if key not in ["role", "content"]:
                raise openai.BadRequestError(
                    message="Error code: 400 - {'error': {'message': \"Additional properties are not allowed ('{key}' was unexpected) - 'messages.{idx}'\", 'type': 'invalid_request_error', 'param': None, 'code': None}}".replace(
                        "{key}", str(key)
                    ).replace(
                        "{idx}", str(idx)
                    ),
                    response=Mock(request=""),
                    body={},
                )

        if not isinstance(message.get("content"), str):
            raise openai.BadRequestError(
                message="Error code: 400 - {'error': {'message': \"'$.messages[{idx}].content' is invalid. Please check the API reference: https://platform.openai.com/docs/api-reference.\", 'type': 'invalid_request_error', 'param': None, 'code': None}}".replace(
                    "{idx}", str(idx)
                ),
                response=Mock(request=""),
                body={},
            )

        if not isinstance(message.get("role"), str):
            raise openai.BadRequestError(
                message="Error code: 400 - {'error': {'message': \"'{message}' is not of type 'string' - 'messages.{idx}.role'\", 'type': 'invalid_request_error', 'param': None, 'code': None}}".replace(
                    "{message}", str(message.get("role"))
                ).replace(
                    "{idx}", str(idx)
                ),
                response=Mock(request=""),
                body={},
            )

        if not (message.get("role") in ["system", "assistant", "user", "function"]):
            raise openai.BadRequestError(
                message="Error code: 400 - {'error': {'message': \"'{message}' is not one of ['system', 'assistant', 'user', 'function'] - 'messages.{idx}.role'\", 'type': 'invalid_request_error', 'param': None, 'code': None}}".replace(
                    "{message}", str(message.get("role"))
                ).replace(
                    "{idx}", str(idx)
                ),
                response=Mock(request=""),
                body={},
            )

    if "temperature" in args:
        if not isinstance(args["temperature"], float) and not isinstance(
            args["temperature"], int
        ):
            raise openai.BadRequestError(
                message="Error code: 400 - {'error': {'message': \"'{temp}' is not of type 'number' - 'temperature'\", 'type': 'invalid_request_error', 'param': None, 'code': None}}".replace(
                    "{temp}", str(args["temperature"])
                ),
                response=Mock(request=""),
                body={},
            )

    if "max_tokens" in args:
        if not isinstance(args["max_tokens"], int):
            raise openai.BadRequestError(
                message="Error code: 400 - {'error': {'message': \"'{max_tokens}' is not of type 'integer' - 'max_tokens'\", 'type': 'invalid_request_error', 'param': None, 'code': None}}".replace(
                    "{max_tokens}", str(args["max_tokens"])
                ),
                response=Mock(request=""),
                body={},
            )

    if "stream" in args:
        if not isinstance(args["stream"], bool):
            raise openai.BadRequestError(
                message="Error code: 400 - {'error': {'message': \"'{stream}' is not of type 'boolean' - 'stream'\", 'type': 'invalid_request_error', 'param': None, 'code': None}}".replace(
                    "{stream}", str(args["stream"])
                ),
                response=Mock(request=""),
                body={},
            )

    message = MOCKED_OPENAI_COMPLETIONS_RESPONSE
    toks = ["Hi,", " how", " can", " I", " help", " you?"]

    if args.get("stream"):
        # return a generator
        def generator():
            for token in toks:
                yield Mock(choices=[Mock(delta=Mock(content=token))])

        return generator()

    else:
        return Mock(choices=[Mock(message=Mock(content=message))])


@pytest.fixture
def mocked_openai_assistants_create(mocker):
    openai.api_key = "fake_key"
    patched_assistants_create = mocker.patch("openai.beta.assistants.create")
    patched_assistants_create.side_effect = openai_assistants_create_side_effect
    return patched_assistants_create


def openai_assistants_create_side_effect(*arguments, **kwargs):
    args = {}
    ordered_args = ["model"]

    for idx, arg in enumerate(arguments):
        args[ordered_args[idx]] = arg

    for key, value in kwargs.items():
        args[key] = value
    if not ("model" in args):
        raise TypeError(
            "Missing required arguments; Expected 'model' arguments to be given"
        )

    model = args["model"]

    if model not in get_args(PossibleOpenAIModels):
        raise openai.NotFoundError(
            message="Error code: 404 - {'error': {'message': 'The model `{model}` does not exist or you do not have access to it.', 'type': 'invalid_request_error', 'param': None, 'code': 'model_not_found'}}".replace(
                "{model}", str(model)
            ),
            response=Mock(request=""),
            body={},
        )

    default_values = {
        "id": "assistant_id",
        "object": "assistant",
        "created_at": int(time.time()),
        "name": "default_name",
        "description": None,
        "model": "gpt-4-turbo",
        "instructions": "default_instructions",
        "tools": [],
        "file_ids": [],
        "metadata": {},
    }
    default_values.update(args)
    return Assistant(**default_values)


@pytest.fixture
def mocked_openai_assistants_delete(mocker):
    # Mock the openai.chat.completions.create function
    openai.api_key = "fake_key"
    patched_completions_create = mocker.patch("openai.beta.assistants.delete")
    patched_completions_create.return_value = {}
    return patched_completions_create


def test_openai_client_init():
    # Test if TypeError is raised when no API key is provided
    with pytest.raises(TypeError) as e:
        OpenAIClient()

    # Test if AssertionError is raised when a numerical API key is provided
    with pytest.raises(AssertionError) as e:
        OpenAIClient(api_key=123)

    assert str(e.value) == "api key must be a string, got: int"

    api_key = "fake_key"

    # Test if AssertionError is raised when an invalid model is provided
    with pytest.raises(AssertionError) as e:
        OpenAIClient(api_key=api_key, model="not a model")

    assert str(e.value) == "model must be a valid OpenAIModel"

    # Test if AssertionError is raised when a non-number temperature is
    # provided
    with pytest.raises(AssertionError) as e:
        OpenAIClient(
            api_key=api_key, model=DEFAULT_MODEL, temperature="not a temperature"
        )

    assert str(e.value) == "temperature must be a number"

    # Test if AssertionError is raised when a non-integer max_tokens is
    # provided
    with pytest.raises(AssertionError) as e:
        OpenAIClient(
            api_key=api_key,
            model=DEFAULT_MODEL,
            temperature=0.7,
            max_tokens="not an int",
        )

    assert str(e.value) == "max_tokens must be an int"

    # Test if the OpenAIClient is correctly initialized with valid parameters
    openai_client = OpenAIClient(
        api_key=api_key, model=DEFAULT_MODEL, temperature=0.7, max_tokens=250
    )

    assert openai_client.api_key == api_key
    assert openai_client.model == DEFAULT_MODEL
    assert openai_client.temperature == 0.7
    assert openai_client.max_tokens == 250


def test_convert_messages_to_openai_format():
    # Test if the messages are correctly converted to the OpenAI format
    messages = [
        {"role": "USER", "content": "Hello"},
        {"role": "SYSTEM", "content": "Hi"},
    ]

    with pytest.raises(AssertionError) as e:

        OpenAIClient.convert_messages_to_openai_format(messages)

    assert str(e.value) == "messages must be a list of Message objects"

    valid_messages = [
        Message(role=Role.USER, content="Hello"),
        Message(role=Role.SYSTEM, content="Hi"),
    ]

    expected_response = [
        {"role": "user", "content": "Hello"},
        {"role": "system", "content": "Hi"},
    ]

    assert (
        OpenAIClient.convert_messages_to_openai_format(valid_messages)
        == expected_response
    )
