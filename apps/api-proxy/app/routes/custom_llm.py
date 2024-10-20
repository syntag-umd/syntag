import asyncio
import logging
from typing import Any, Dict, List, Literal, Optional, Union
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
import httpx
from datetime import datetime, timedelta, timezone
from pydantic import BaseModel
import time
from opentelemetry.propagate import inject
from app.utils import suppress_library_logging


class Message(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    model: str
    messages: List[Any]
    temperature: float
    tools: Optional[List[Any]] = None
    stream: bool
    max_tokens: int
    call: Any
    phoneNumber: Optional[Any] = None
    customer: Optional[Any] = None
    metadata: Dict[str, Any]


router = APIRouter(prefix="/custom-llm")

client_develop = httpx.AsyncClient(base_url="https://develop-api.syntag.ai")
client_production = httpx.AsyncClient(base_url="https://api.syntag.ai")


async def measure_coroutine_time(
    name, coroutine, *args, **kwargs
) -> tuple[str, Union[int, None]]:
    start = time.time()
    try:
        await asyncio.wait_for(coroutine(*args, **kwargs), 10)
    except asyncio.TimeoutError:
        return (name, None)
    return (name, round((time.time() - start) * 1000))


@router.get("/proxy/ping")
async def ping_proxy():
    try:
        with suppress_library_logging(["httpx"], level=logging.ERROR):
            m_pd = measure_coroutine_time(
                "develop",
                client_develop.get,
                "https://develop-api.syntag.ai/test/ping",
                headers={"Connection": "keep-alive", "Keep-Alive": "timeout=90"},
            )
            m_pp = measure_coroutine_time(
                "production",
                client_production.get,
                "https://api.syntag.ai/test/ping",
                headers={"Connection": "keep-alive", "Keep-Alive": "timeout=90"},
            )
            results = await asyncio.gather(m_pd, m_pp)

            return {f"{name}": elapsed_time for (name, elapsed_time) in results}
    except Exception as e:
        logging.error(f"Error on ping: {repr(e)}")
        return {"error": repr(e)}


@router.post("/proxy/{env}/{path}/chat/completions")
async def get_proxy_response(
    env: Literal["develop", "production"],
    path: Literal["fast", "manual", "openai"],
    body: ChatRequest,
):
    est_offset = timedelta(hours=-5)
    est = timezone(est_offset)
    current_time = datetime.now(timezone.utc).astimezone(est)
    formatted_time = current_time.strftime("%H:%M:%S:%f")[:-3]

    logging.info(f"{formatted_time} PROXY {env}: {body.messages[-1].get('content')}")
    logging.info(f"{formatted_time} request: {body}")

    if env == "develop":
        client = client_develop
    else:
        client = client_production

    headers = dict()
    inject(headers)

    async def stream_response():
        async with client.stream(
            "POST",
            f"/custom-llm/{path}/chat/completions",
            json=body.model_dump(),
            headers=headers,
        ) as response:
            current_time = datetime.now(timezone.utc).astimezone(est)
            formatted_time = current_time.strftime("%H:%M:%S:%f")[:-3]
            logging.info(
                f"{formatted_time} PROXY {env} TTFB: {body.messages[-1].get('content')}"
            )
            async for chunk in response.aiter_text():
                yield chunk

    return StreamingResponse(stream_response(), media_type="text/event-stream")
