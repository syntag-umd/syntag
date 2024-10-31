# flake8: noqa: F841
import logging
from typing import Any, Dict, Literal, Optional
from fastapi import APIRouter, Body, Depends, Response
import httpx
from openai import AsyncOpenAI
from pydantic import BaseModel
import requests
from sqlalchemy import text
from sqlalchemy.orm import Session, joinedload
from app.database.session import get_db
from app.database.tables.user import User
from app.database.tables.voice_assistant import VoiceAssistant
import time
from app.services.pinecone.utils import pc_index
from app.core.config import settings
from app.services.llm import azure_text3large_embedding, azure_gpt4o_mini

import socket
import ssl
from urllib.parse import urlparse
import json

router = APIRouter(prefix="/test")


@router.get("/pinecone-describe")
async def test_pinecone_describe():

    pc_index_time = time.time()
    res = pc_index.describe_index_stats()
    pc_index_time = time.time() - pc_index_time
    pc_index_time = round(pc_index_time * 1000)

    return {
        "pc_index": pc_index_time,
    }


@router.get("/pinecone-with-curl")
async def test_pinecone_curl():
    curl_time = time.time()
    curl = requests.get(
        "https://default-index-1r1qr7l.svc.eastus2-5e25.prod-azure.pinecone.io/vectors/fetch?ids=4ee7ced7-6e4f-4e7b-b970-30a4bb37e575%231&namespace=e48d74d6-ebce-46dc-aabf-22c72ca40d3c",
        headers={
            "Api-Key": settings.PINECONE_API_KEY,
            "X-Pinecone-API-Version": "2024-07",
        },
    )

    curl_time = time.time() - curl_time
    curl_time = round(curl_time * 1000)

    pc_index_time = time.time()
    res = pc_index.fetch(
        ids=["4ee7ced7-6e4f-4e7b-b970-30a4bb37e575#1"],
        namespace="e48d74d6-ebce-46dc-aabf-22c72ca40d3c",
    )
    pc_index_time = time.time() - pc_index_time
    pc_index_time = round(pc_index_time * 1000)

    pc_index2_time = time.time()
    res2 = pc_index.fetch(
        ids=["4ee7ced7-6e4f-4e7b-b970-30a4bb37e575#1"],
        namespace="e48d74d6-ebce-46dc-aabf-22c72ca40d3c",
    )
    pc_index2_time = time.time() - pc_index2_time
    pc_index2_time = round(pc_index2_time * 1000)

    cur_start2 = time.time()
    curl2 = requests.get(
        "https://default-index-1r1qr7l.svc.eastus2-5e25.prod-azure.pinecone.io/vectors/fetch?ids=4ee7ced7-6e4f-4e7b-b970-30a4bb37e575%231&namespace=e48d74d6-ebce-46dc-aabf-22c72ca40d3c",
        headers={
            "Api-Key": settings.PINECONE_API_KEY,
            "X-Pinecone-API-Version": "2024-07",
        },
    )
    curl2_time = time.time() - cur_start2
    curl2_time = round(curl2_time * 1000)
    logging.info(f"Curl 2 {curl2_time}")

    return {
        "curl": curl_time,
        "pc_index": pc_index_time,
        "pc_index2": pc_index2_time,
        "curl2": curl2_time,
    }


@router.get("/pinecone")
async def test_pinecone():

    pc_index_time = time.time()
    res = pc_index.query(
        filter={"knowledge_uuid": {"$in": ["haha", "nana"]}}, timeout=0.5
    )
    pc_index_time = time.time() - pc_index_time
    pc_index_time = round(pc_index_time * 1000)

    pc_index2_time = time.time()
    res2 = pc_index.query(
        filter={"knowledge_uuid": {"$in": ["haha", "nana"]}}, timeout=0.5
    )
    pc_index2_time = time.time() - pc_index2_time
    pc_index2_time = round(pc_index2_time * 1000)

    return {
        "pc_index": pc_index_time,
        "pc_index2": pc_index2_time,
    }


@router.get("/database")
async def test_database(db: Session = Depends(get_db)):
    start_users = time.time()
    users = db.query(User).all()
    end_users = time.time()
    users_time = end_users - start_users
    users_time = round(users_time * 1000)

    start_users_raw = time.time()
    query = text(
        'SELECT "public"."user"."id", "public"."user"."uuid", "public"."user"."createdAt", '
        '"public"."user"."updatedAt", "public"."user"."name", "public"."user"."email", '
        '"public"."user"."api_key", '
        '"public"."user"."stripe_customer_id", '
        '"public"."user"."clerk_id", "public"."user"."pn" '
        'FROM "public"."user" WHERE 1=1 OFFSET :offset'
    )

    # Replace `offset_value` with the desired offset value
    result = db.execute(query, {"offset": 0})

    # Fetch all results
    users = result.fetchall()
    end_users_raw = time.time()
    users_time_raw = end_users_raw - start_users_raw
    users_time_raw = round(users_time_raw * 1000)

    start_user = time.time()
    user = db.query(User).filter(User.email.like("%max%"))
    end_user = time.time()
    user_time = end_user - start_user
    user_time = round(user_time * 1000)

    start_user_assistant = time.time()
    voice_assistant_query = (
        db.query(VoiceAssistant)
        .filter(
            VoiceAssistant.vapi_assistant_id == "4eca46b4-99f6-4f00-a28f-3bd9bd638fe1"
        )
        .options(joinedload(VoiceAssistant.knowledge), joinedload(VoiceAssistant.user))
    )

    voice_assistant = voice_assistant_query.first()
    end_user_assistant = time.time()
    user_assistant_time = end_user_assistant - start_user_assistant
    user_assistant_time = round(user_assistant_time * 1000)

    logging.info(f"Users time: {users_time}")
    logging.info(
        f"Users raw time: {users_time_raw}",
    )
    logging.info(
        f"User time: {user_time}",
    )
    logging.info(f"User assistant time: {user_assistant_time}")

    return {
        "users": users_time,
        "users_raw": users_time_raw,
        "user": user_time,
        "user_assistant": user_assistant_time,
    }


@router.get("/azure-openai-embed")
async def test_azure_openai_embed(
    embed_times: int = 0,
    embed_inv_times: int = 5,
    cache: Literal["cached", "new-cache", "no-cache"] = "new-cache",
    print_error: bool = False,
):
    this_http_client = httpx.AsyncClient()

    this_http_client = AsyncOpenAI(
        base_url="https://syntag-eastus.openai.azure.com/openai/deployments/text-embedding-3-large",
        default_headers={"api-key": settings.AZURE_AI_HUB_KEY},
        default_query={"api-version": "2023-05-15"},
        http_client=this_http_client,
    )

    def get_client():
        if cache == "cached":
            return azure_text3large_embedding
        elif cache == "new-cache":
            return this_http_client
        else:
            http_client = httpx.AsyncClient()

            new_azure_text3large_embedding = AsyncOpenAI(
                base_url="https://syntag-eastus.openai.azure.com/openai/deployments/text-embedding-3-large",
                default_headers={"api-key": settings.AZURE_AI_HUB_KEY},
                default_query={"api-version": "2023-05-15"},
                http_client=http_client,
            )
            return new_azure_text3large_embedding

    data = {
        "embed_times": [],
        "embed_inv_times": [],
    }

    for i in range(embed_inv_times):
        embed_time_inv = None
        start_embed_inv = time.time()
        client = get_client()
        try:
            res = await client.embeddings.create(
                input=[], model="text-embedding-3-large"
            )
        except Exception as e:
            if print_error:
                logging.error(e)
        embed_time_inv = time.time() - start_embed_inv
        embed_time_inv = round(embed_time_inv * 1000)
        data["embed_inv_times"].append(embed_time_inv)
        logging.info(f"{i} Embed invalid time {embed_time_inv}")

    for i in range(embed_times):
        start_embed = time.time()
        client = get_client()
        res = await client.embeddings.create(
            input=["Hello"], model="text-embedding-3-large"
        )
        embed_time = time.time() - start_embed
        embed_time = round(embed_time * 1000)
        data["embed_times"].append(embed_time)
        logging.info(f"{i} Embed invalid time {embed_time}")

    return data


@router.get("/azure-openai-llm")
async def test_azure_openai_llm(invalid_first: bool = False):

    llm_time_inv = None
    if invalid_first and True:
        start_llm_inv = time.time()
        try:
            res = await azure_gpt4o_mini.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "Invalid role", "content": "Say one word: Apple"}],
            )
            logging.error(f"Somehow didn't throw an error {res}")
        except Exception:
            pass
        llm_time_inv = time.time() - start_llm_inv
        llm_time_inv = round(llm_time_inv * 1000)
        logging.info(f"LLM invalid time {llm_time_inv}")
    start_llm = time.time()
    res = await azure_gpt4o_mini.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": "Say one word: Apple"}],
    )
    llm_time = time.time() - start_llm
    llm_time = round(llm_time * 1000)
    logging.info(f"LLM time {llm_time}")

    start_llm2 = time.time()
    res2 = await azure_gpt4o_mini.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": "Say one word: Apple"}],
    )
    llm_time2 = time.time() - start_llm2
    llm_time2 = round(llm_time2 * 1000)
    logging.info(f"LLM time 2 {llm_time2}")

    return {"llm": llm_time, "llm2": llm_time2, "llm_time_inv": llm_time_inv}


def measure_full_request_time(url, method="GET", body=None):
    # Parse the URL to extract hostname, port, and path
    parsed_url = urlparse(url)
    hostname = parsed_url.hostname
    port = (
        parsed_url.port
        if parsed_url.port
        else (443 if parsed_url.scheme == "https" else 80)
    )
    path = parsed_url.path if parsed_url.path else "/"

    # Construct the HTTP request
    request_line = f"{method} {path} HTTP/1.1\r\nHost: {hostname}\r\n"
    headers = "Connection: close\r\n\r\n"
    if isinstance(body, dict):
        body = json.dumps(body)
    request_body = body if body else ""
    request = request_line + headers + request_body

    full_start = time.time()

    # Measure DNS resolution time
    dns_start = time.time()
    ip_address = socket.gethostbyname(hostname)
    dns_end = time.time()

    # Measure TCP handshake time
    tcp_start = time.time()
    sock = socket.create_connection((ip_address, port))
    tcp_end = time.time()

    # Measure TLS handshake time (only if HTTPS)
    if parsed_url.scheme == "https":
        tls_start = time.time()
        context = ssl.create_default_context()
        sock = context.wrap_socket(sock, server_hostname=hostname)
        tls_end = time.time()
    else:
        tls_start = tls_end = tcp_end  # No TLS handshake for HTTP

    # Measure total time for full request (HTTP request and data transfer)
    total_start = time.time()
    sock.sendall(request.encode())
    response = sock.recv(4096)
    total_end = time.time()

    # Close the connection
    sock.close()

    data = {
        "dns": ((dns_end - dns_start) * 1000),
        "tcp": ((tcp_end - tcp_start) * 1000),
        "tls": ((tls_end - tls_start) * 1000) if parsed_url.scheme == "https" else 0,
        "http": ((total_end - total_start) * 1000),
        "full": ((total_end - full_start) * 1000),
    }

    logging.info(f"DNS time:  {data['dns']} ms")
    logging.info(f"TCP time:  {data['tcp']} ms")
    logging.info(f"TLS time:  {data['tls']} ms")
    logging.info(f"HTTP time: {data['http']} ms")
    logging.info(f"Full time: {data['full']} ms")

    return data


class TestUrl(BaseModel):
    url: str
    method: Literal["GET", "POST"]
    request_body: Optional[Dict[str, Any]] = None


@router.post("/test-url")
async def test_url(body: TestUrl = Body(...)):
    data = measure_full_request_time(
        body.url, method=body.method, body=body.request_body
    )
    return data


@router.get("/ping")
async def ping(response: Response, keep_alive: bool = False):
    if keep_alive:
        response.headers["Connection"] = "Keep-Alive"
        response.headers["Keep-Alive"] = "timeout=300"
    logging.debug(f"GET ping: {round(time.time() * 1000)}")
    return {"message": "healthy"}


@router.head("/ping")
async def ping_head(response: Response):
    logging.info(f"HEAD ping: {round(time.time() * 1000)}")
    response.headers["Connection"] = "Keep-Alive"
    response.headers["Keep-Alive"] = "timeout=300"

    return None


@router.head("/ping-close")
async def ping_head_close(response: Response):
    logging.info(f"HEAD ping-close: {round(time.time() * 1000)}")
    response.headers["Connection"] = "close"

    return None
