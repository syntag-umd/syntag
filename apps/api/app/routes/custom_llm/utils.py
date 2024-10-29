# flake8: noqa: F841
import asyncio
import json
import logging
import time
from typing import Dict, List, Literal, Tuple, Union

from sqlalchemy import text
from app.models.enums import DEFAULT_TOKEN_COUNT
from nlp_syntag.llm.vapi import Message
from fastapi.responses import StreamingResponse
import tiktoken
from app.services.pinecone.utils import pc_index
from app.core.config import settings
from app.services.openai.utils import azure_text3large_embedding, azure_gpt4o_mini
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from app.utils import suppress_library_logging
from opentelemetry import trace

tracer = trace.get_tracer(__name__)


def generate_chat_response(content: str, role="assistant") -> StreamingResponse:

    firstChunk = {
        "id": "chatcmpl-9nHjNxOCr0u5kT3eJuUyHrr9xtVav",
        "choices": [
            {
                "delta": {
                    "content": content,
                    "function_call": None,
                    "refusal": None,
                    "role": role,
                    "tool_calls": None,
                },
                "finish_reason": None,
                "index": 0,
                "logprobs": None,
            }
        ],
        "created": 1724386673,
        "model": "gpt-4o-2024-05-13",
        "object": "chat.completion.chunk",
        "service_tier": None,
        "system_fingerprint": None,
        "usage": None,
    }

    formattedTransferCall = f"data: {json.dumps(firstChunk)}\n\n"
    endformattedTransferCall = """data: {"id":"chatcmpl-9nHjNxOCr0u5kT3eJuUyHrr9xtVav","choices":[{"delta":{"content":null,"function_call":null,"role":null,"tool_calls":null},"finish_reason":"stop","index":0,"logprobs":null}],"created":1721533257,"model":"gpt-4o-2024-05-13","object":"chat.completion.chunk","service_tier":null,"system_fingerprint":"null","usage":null}

data: [DONE]"""
    formattedTransferCall += endformattedTransferCall

    transfercall_pre_res = StreamingResponse(
        formattedTransferCall, media_type="text/event-stream"
    )
    return transfercall_pre_res


def generate_transfer_call_response(pn: str) -> StreamingResponse:
    """Programmatic generation of the response to transfer a call to a phone number

    Assistant **must**  have the transferCall function set, and the pn **must**  be set on the assistant, and should be formatted like +14129961122

    Inside custom url: return generate_transfer_call_response("+12294148610")
    """
    firstChunk = {
        "id": "chatcmpl-9nHjNxOCr0u5kT3eJuUyHrr9xtVav",
        "choices": [
            {
                "delta": {
                    "content": None,
                    "function_call": None,
                    "role": "assistant",
                    "tool_calls": [
                        {
                            "index": 0,
                            "id": "call_GUWqNMYTds7dilMlNNdOLJqV",
                            "function": {
                                "arguments": '{"destination":"' + pn + '"}',
                                "name": "transferCall",
                            },
                            "type": "function",
                        }
                    ],
                },
                "finish_reason": None,
                "index": 0,
                "logprobs": None,
            }
        ],
        "created": 1721533257,
        "model": "gpt-4o-2024-05-13",
        "object": "chat.completion.chunk",
        "service_tier": None,
        "system_fingerprint": "fp_c4e5b6fa31",
        "usage": None,
    }

    formattedTransferCall = f"data: {json.dumps(firstChunk)}\n\n"
    endformattedTransferCall = """data: {"id":"chatcmpl-9nHjNxOCr0u5kT3eJuUyHrr9xtVav","choices":[{"delta":{"content":null,"function_call":null,"role":null,"tool_calls":null},"finish_reason":"tool_calls","index":0,"logprobs":null}],"created":1721533257,"model":"gpt-4o-2024-05-13","object":"chat.completion.chunk","service_tier":null,"system_fingerprint":"fp_c4e5b6fa31","usage":null}

data: [DONE]"""
    formattedTransferCall += endformattedTransferCall

    transfercall_pre_res = StreamingResponse(
        formattedTransferCall, media_type="text/event-stream"
    )
    return transfercall_pre_res


def truncate_conversation(messages: List[Message], max_tokens=8000):
    """Takes the last part of the conversation."""
    content = ""
    for msg in messages:
        if msg.get("content") and (msg["role"] == "assistant" or msg["role"] == "user"):
            content += msg["role"].upper() + ": " + msg.get("content") + "\n\n"
    content = content.rstrip()
    encoding = tiktoken.encoding_for_model(DEFAULT_TOKEN_COUNT)
    tokens = encoding.encode(content)

    if len(tokens) > max_tokens:
        tokens = tokens[-max_tokens:]
        truncated_message = encoding.decode(tokens)
    else:
        truncated_message = content

    return truncated_message


async def warmup_custom_llm(
    session: Session,
    timeout=10,
    logging_arg: Literal["info", "error", "none"] = settings.LOGGING_WARMUP_CUSTOM_LLM,
) -> tuple[bool, Dict[str, Union[int, None]]]:
    with tracer.start_as_current_span("warmup_custom_llm"):
        if logging_arg == "info":
            now_utc = datetime.now(timezone.utc)
            readable_utc_time = now_utc.strftime("%b %d %I:%M:%S %p")
            logging.info(f"{readable_utc_time}===Warming up Custom LLM===")

        async def measure_coroutine_time(
            name: str,
            coroutine_func,
            *args,
            **kwargs
        ) -> Tuple[str, Union[int, None]]:
            start = time.time()
            try:
                await asyncio.wait_for(coroutine_func(*args, **kwargs), timeout)
            except asyncio.TimeoutError:
                return (name, None)
            return (name, round((time.time() - start) * 1000))

        async def catch_llm():
            try:
                with suppress_library_logging(["httpx"], level=logging.ERROR):
                    await azure_gpt4o_mini.chat.completions.create(
                        model="gpt-4o-mini",
                        messages=[
                            {"role": "INVALID ROLE", "content": "Say one word: Apple"}
                        ],
                    )
            except Exception:
                pass

        async def catch_embedding():
            try:
                with suppress_library_logging(["httpx"], level=logging.ERROR):
                    await azure_text3large_embedding.embeddings.create(
                        input=[], model="text-embedding-3-large"
                    )
            except Exception:
                pass

        coroutines = [
            # Database operation (sync function)
            measure_coroutine_time(
                "Db", asyncio.to_thread, session.execute, text("SELECT 1")
            ),
            # Pinecone (Sync function, wrapped with `asyncio.to_thread`)
            measure_coroutine_time(
                "Pinecone", asyncio.to_thread, pc_index.describe_index_stats
            ),
            # LLM (Async function)
            measure_coroutine_time("LLM", catch_llm),
            # Embedding (Async function)
            measure_coroutine_time("Embedding", catch_embedding),
        ]

        results = await asyncio.gather(*coroutines)
        success_flag = True
        for name, elapsed_time in results:
            if elapsed_time is None:
                # success_flag = False
                if logging_arg == "error" or logging_arg == "info":
                    logging.info(f"{name} timed out")
            else:
                if logging_arg == "info":
                    logging.info(f"{name} time: {elapsed_time}ms")

        return (success_flag, {f"{name}": elapsed_time for (name, elapsed_time) in results})


def merge_intervals(intervals: List[Tuple[int, int]]) -> List[Tuple[int, int]]:
    intervals.sort(key=lambda x: x[0])

    # List to hold merged intervals
    merged_intervals = []

    for interval in intervals:
        # If the list is empty or there's no overlap, add the interval as is
        if not merged_intervals or merged_intervals[-1][1] < interval[0]:
            merged_intervals.append(interval)
        else:
            # If there is an overlap, merge the intervals by updating the end value
            merged_intervals[-1] = (
                merged_intervals[-1][0],
                max(merged_intervals[-1][1], interval[1]),
            )

    return merged_intervals
