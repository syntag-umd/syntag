# openai_client.py

import logging
from typing import List, Union, get_args

import openai

from app.core.config import settings
from app.models.enums import DEFAULT_MODEL, PossibleOpenAIModels
from app.models.schemas import Message

OPENAI_API_KEY = settings.OPENAI_API_KEY


def get_openai_client(
    model: PossibleOpenAIModels = DEFAULT_MODEL,
    temperature: float = 0.7,
    max_tokens: int = 250,
):
    return OpenAIClient(
        api_key=OPENAI_API_KEY,
        model=model,
        temperature=temperature,
        max_tokens=max_tokens,
    )


class OpenAIClient:

    def __init__(
        self,
        api_key: str,
        model: PossibleOpenAIModels = DEFAULT_MODEL,
        temperature: Union[float, int] = 0.7,
        max_tokens: int = 250,
    ):

        assert isinstance(
            api_key, str
        ), f"api key must be a string, got: {type(api_key).__name__}"
        logging.info(f"MODEL: {model}")
        logging.info(f"{model} {get_args(PossibleOpenAIModels)}")
        assert model in get_args(
            PossibleOpenAIModels
        ), "model must be a valid OpenAIModel"
        assert isinstance(temperature, float) or isinstance(
            temperature, int
        ), "temperature must be a number"
        assert isinstance(max_tokens, int), "max_tokens must be an int"

        self.api_key = api_key
        self.model = model
        self.temperature = temperature
        self.max_tokens = max_tokens

    def convert_messages_to_openai_format(messages: List[Message]):

        for message in messages:
            assert isinstance(
                message, Message
            ), "messages must be a list of Message objects"

        return [
            {"role": message.role.lower(), "content": message.content}
            for message in messages
        ]

    def single_response(self, prompt: str):

        assert isinstance(prompt, str), "prompt must be a string"

        messages = [{"role": "user", "content": prompt}]

        openai.api_key = self.api_key

        response = openai.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=self.temperature,
            max_tokens=self.max_tokens,
        )

        return response.choices[0].message.content

    def server_and_user_message_response(self, server_prompt: str, user_prompt: str):

        assert isinstance(server_prompt, str), "server_prompt must be a string"

        assert isinstance(user_prompt, str), "user_prompt must be a string"

        messages = [
            {"role": "system", "content": server_prompt},
            {"role": "user", "content": user_prompt},
        ]

        response = openai.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=self.temperature,
            max_tokens=self.max_tokens,
        )

        return response.choices[0].message.content

    def conversation_response(self, messages: list):

        formatted_messages = OpenAIClient.convert_messages_to_openai_format(messages)

        response = openai.chat.completions.create(
            model=self.model,
            messages=formatted_messages,
            temperature=self.temperature,
            max_tokens=self.max_tokens,
        )

        return response.choices[0].message.content

    def single_response_stream(self, prompt: str):

        assert isinstance(prompt, str), "prompt must be a string"

        messages = [{"role": "user", "content": prompt}]

        # Initiates the stream and specifies a callback function to handle the
        # stream's output
        stream = openai.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=self.temperature,
            max_tokens=self.max_tokens,
            stream=True,
        )

        for response in stream:
            message_content = response.choices[0].delta.content
            if message_content:
                yield message_content

    def server_and_user_message_response_stream(
        self, server_prompt: str, user_prompt: str
    ):

        assert isinstance(server_prompt, str), "server_prompt must be a string"

        assert isinstance(user_prompt, str), "user_prompt must be a string"

        messages = [
            {"role": "system", "content": server_prompt},
            {"role": "user", "content": user_prompt},
        ]

        # Initiates the stream and specifies a callback function to handle the
        # stream's output
        stream = openai.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=self.temperature,
            max_tokens=self.max_tokens,
            stream=True,
        )

        for response in stream:
            message_content = response.choices[0].delta.content
            if message_content:
                yield message_content

    def conversation_response_stream(self, messages: list):

        formatted_messages = OpenAIClient.convert_messages_to_openai_format(messages)

        # Initiates the stream and specifies a callback function to handle the
        # stream's output
        stream = openai.chat.completions.create(
            model=self.model,
            messages=formatted_messages,
            temperature=self.temperature,
            max_tokens=self.max_tokens,
            stream=True,
        )

        for response in stream:
            message_content = response.choices[0].delta.content
            if message_content:
                yield message_content
