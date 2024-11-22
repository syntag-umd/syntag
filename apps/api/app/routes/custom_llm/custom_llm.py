import json
import logging
import time
import copy
from typing import Coroutine, Generator, List, Literal, Tuple, cast
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.tables.conversation import Conversation, ConversationCache
from app.database.tables.knowledge import Knowledge
from app.models.enums import ChatMedium, KnowledgeType, Language
from nlp_syntag.llm.vapi import ChatCallRequest, Message
from app.database.tables.voice_assistant import VoiceAssistant
from app.database.tables.chunks import Chunk
from app.routes.custom_llm.utils import (
    generate_chat_response,
    merge_intervals,
    truncate_conversation,
    warmup_custom_llm,
)
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from fastapi.responses import StreamingResponse
from app.services.llm import async_openai_client
from app.services.pinecone.utils import pc_index
from app.database.session import get_db
from app.core.config import settings
import asyncio
from app.services.llm import langfuse, azure_text3large_embedding, azure_gpt4o_mini
import traceback
from datetime import datetime, timedelta, timezone
from opentelemetry import trace
from langfuse.client import StatefulTraceClient, StatefulGenerationClient
from openai.types.chat.chat_completion_chunk import ChatCompletionChunk

router = APIRouter(prefix="/custom-llm")
otel_tracer = trace.get_tracer(__name__)


@router.post("/fast/chat/completions")
async def get_fast_response(
    # request: Request,
    body: ChatCallRequest,
    db: Session = Depends(get_db),
):
    current_span = trace.get_current_span()
    current_span_context = current_span.get_span_context()

    lf_trace = langfuse.trace(
        name="chat_call_request",
        input=body.model_dump(),
        metadata={
            "otel.trace.id": current_span_context.trace_id,
            "otel.span.id": current_span_context.span_id,
        },
    )
    logging.info(
        f"===custom llm===\nLangfuse Trace:{lf_trace.get_trace_url()}\nBody: {body.model_dump_json()}"
    )

    try:
        body_messages: List[Message] = body.messages

        # body_messages_content = [message.content for message in body_messages if message.role != "tool"]
        lf_trace.update(input=body_messages)

        last_message = body_messages[-1]
        logging.info(f"{last_message['role']}: {last_message.get('content')}")

        top_k: int = 10

        vapi_assistant_id = body.call.assistantId

        with otel_tracer.start_as_current_span("get_voice_assistant"):
            voice_assistant_query = (
                db.query(VoiceAssistant)
                .filter(VoiceAssistant.vapi_assistant_id == vapi_assistant_id)
                .options(
                    joinedload(VoiceAssistant.knowledge),
                    joinedload(VoiceAssistant.user),
                )
            )
            voice_assistant = voice_assistant_query.first()
            if not voice_assistant:
                raise HTTPException(
                    status_code=404, detail=f"Assistant not found {vapi_assistant_id}"
                )

        assistant_config = voice_assistant.agent_config
        skip_embedding = False
        if assistant_config.get("type") == "squire":
            skip_embedding = True

        @otel_tracer.start_as_current_span("get_convo_db")
        async def get_convo_db(voice_assistant: VoiceAssistant):
            convo_query = db.query(Conversation).filter(
                Conversation.vapiCallId == body.call.id
            )
            convo = convo_query.first()
            if not convo:
                convo = Conversation(
                    voice_assistant_uuid=voice_assistant.uuid,
                    vapiCallId=body.call.id,
                    userUuid=voice_assistant.userUuid,
                    cache={"previously_injected_chunk_ids": []},
                    viewed=False,
                    starred=False,
                    language=Language.ENGLISH,
                    medium=(
                        ChatMedium.PHONE if body.phoneNumber else ChatMedium.VOICECHAT
                    ),
                    caller_pn=body.customer.number if body.customer else None,
                    assistant_pn=body.phoneNumber.number if body.phoneNumber else None,
                )
                db.add(convo)
                db.flush()
                db.refresh(convo)

            return convo

        @otel_tracer.start_as_current_span("embed_convo")
        async def embed_convo():

            conversation_content = truncate_conversation(body_messages)

            try:
                embedded = await azure_text3large_embedding.embeddings.create(
                    input=conversation_content,
                    model="text-embedding-3-large",
                )
                return embedded
            except Exception as e:
                logging.error(
                    f"Error during embedding: {repr(e)}\nTraceback:\n{traceback.format_exc()}"
                )
                return None

        user_uuid = str(voice_assistant.user.uuid)
        knowledge = voice_assistant.knowledge
        knowledge_uuids = [str(kn.uuid) for kn in knowledge]

        lf_trace = lf_trace.update(
            user_id=user_uuid,
            session_id=body.call.id,
            metadata={
                "skip_embedding": skip_embedding,
                "voice_assistant.uuid": str(voice_assistant.uuid),
            },
        )
        if skip_embedding:

            embedded = None

        else:
            embed_convo_task = asyncio.create_task(embed_convo())
            get_convo_db_task = asyncio.create_task(get_convo_db(voice_assistant))

            await asyncio.wait_for(
                asyncio.gather(embed_convo_task, get_convo_db_task), timeout=2
            )
            embedded = embed_convo_task.result()
            convo = get_convo_db_task.result()

            convo_cache = convo.cache
            if not convo_cache:
                convo_cache: ConversationCache = {"previously_injected_chunk_ids": []}

        chunks = []
        if embedded is not None:
            with otel_tracer.start_as_current_span("query_pinecone"):
                lf_retrieval_span = lf_trace.span(name="retrieval")
                try:
                    lf_query_pinecone = lf_retrieval_span.span(
                        name="query_pinecone",
                        input={
                            "vector": embedded.data[0].embedding,
                            "namespace": user_uuid,
                            "top_k": top_k,
                            "filter": {"knowledge_uuid": {"$in": knowledge_uuids}},
                            "include_metadata": True,
                            "timeout": 1,
                        },
                    )
                    query_top_k = top_k + len(
                        convo_cache["previously_injected_chunk_ids"]
                    )
                    vector = embedded.data[0].embedding
                    query_result = pc_index.query(
                        vector=vector,
                        namespace=user_uuid,
                        top_k=query_top_k,
                        filter={"knowledge_uuid": {"$in": knowledge_uuids}},
                        include_metadata=True,
                        timeout=1,
                    )
                    lf_query_pinecone.end(output=query_result.to_dict())

                    count_new_chunks = 0
                    for match in query_result.get("matches", []):
                        if count_new_chunks >= top_k:
                            break
                        score = match.get("score", 0)
                        metadata = match.get("metadata", {})
                        chunk_id = metadata.get("chunk_id", None)
                        if chunk_id is None:
                            continue

                        if score > 0.25:
                            chunk_id = int(chunk_id)
                            if (
                                chunk_id
                                not in convo_cache["previously_injected_chunk_ids"]
                            ):
                                count_new_chunks += 1
                                convo_cache["previously_injected_chunk_ids"].append(
                                    chunk_id
                                )
                            chunks.append(chunk_id)
                        else:
                            pass
                except Exception as e:
                    logging.error(
                        f"Error during Pinecone query: {repr(e)}\nTraceback:\n{traceback.format_exc()}"
                    )
                    chunks = []
                    retrieval_span = retrieval_span.update(level="ERROR")

                lf_retrieval_span.end(output=chunks)

        if len(chunks) > 0:
            chunks = chunks[:top_k]
            chunks.reverse()
            with otel_tracer.start_as_current_span("get_chunks"):

                chunk_results = db.query(Chunk).filter(Chunk.id.in_(chunks)).all()
                hit_knowledge_uuids = [chunk.knowledgeUuid for chunk in chunk_results]
                knowledge_results = (
                    db.query(Knowledge)
                    .filter(Knowledge.uuid.in_(hit_knowledge_uuids))
                    .all()
                )

            system_message = "Search results found the following information that might be relevant: "

            for knowledge in knowledge_results:
                if knowledge.content is None:
                    continue
                if knowledge.type == KnowledgeType.WEBSITE:
                    title = knowledge.url
                else:
                    title = knowledge.display_name
                title = title if title else "unknown"

                system_message += f"\n\n Source: {title}:"
                intervals = [
                    (chunk.content_start_index, chunk.content_last_index)
                    for chunk in chunk_results
                    if chunk.knowledgeUuid == knowledge.uuid
                ]
                merged_intervals = merge_intervals(intervals)
                logging.info(
                    f"KNOWLEDGE: {str(knowledge.uuid)} {title} {merged_intervals}"
                )
                for start, last in merged_intervals:
                    system_message += f"{knowledge.content[start:last + 1]}..."

            reminder_message = "Remember, you are on a phone call. Your response to the caller should be accurate and concise. Do not monologue. Here is the caller's message:"

            messsages = (
                body_messages[:-1]
                + [{"role": "system", "content": system_message}]
                + [{"role": "system", "content": reminder_message}]
                + [body_messages[-1]]
            )

        else:
            messsages = body_messages

        lf_generation = lf_trace.generation(
            name="llm_request",
            input={"messages": messsages, "tools": body.tools, "stream": True},
        )

        @otel_tracer.start_as_current_span("llm_request")
        async def llm_request():
            @otel_tracer.start_as_current_span("azure_gpt_4o_mini_request")
            async def azure_gpt_4o_mini_request():
                completion = await azure_gpt4o_mini.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=messsages,
                    tools=body.tools,
                    stream=True,
                )
                return ("azure-gpt-4o-mini", completion)

            @otel_tracer.start_as_current_span("openai_gpt_35_request")
            async def openai_gpt_35_request():
                min_time = 1
                start_time = time.time()

                completion = await async_openai_client.chat.completions.create(
                    model="gpt-3.5-turbo",
                    messages=messsages,
                    tools=body.tools,
                    stream=True,
                )
                if time.time() - start_time < min_time:
                    await asyncio.sleep(min_time - (time.time() - start_time))

                return ("openai-gpt-3.5-turbo", completion)

            tasks = [
                asyncio.create_task(azure_gpt_4o_mini_request()),
                asyncio.create_task(openai_gpt_35_request()),
            ]

            done, pending = await asyncio.wait(
                tasks, return_when=asyncio.FIRST_COMPLETED
            )
            for task in pending:
                task.cancel()
            for task in done:
                name, completion = task.result()
            return name, completion

        model_name, completion = await llm_request()
        lf_generation = lf_generation.update(model=model_name)

        if not skip_embedding:
            with otel_tracer.start_as_current_span("update_convo_db"):
                updated_cache = copy.deepcopy(convo_cache)
                cache_statement = (
                    update(Conversation)
                    .where(Conversation.id == convo.id)
                    .values(cache=updated_cache)
                    .execution_options(synchronize_session="fetch")
                )
                db.execute(cache_statement)
                db.commit()

        @otel_tracer.start_as_current_span("event_stream")
        async def event_stream(
            completion: Generator[ChatCompletionChunk, None, None],
            lf_trace: StatefulTraceClient,
            lf_generation: StatefulGenerationClient,
        ):
            complete_output = ""
            try:
                i = 0
                async for chunk in completion:
                    chunk = cast(ChatCompletionChunk, chunk)
                    if i == 0:
                        lf_generation = lf_generation.update(
                            completion_start_time=datetime.now()
                        )
                    delta_content = chunk.choices[0].delta.content
                    complete_output += delta_content if delta_content else ""
                    yield f"data: {json.dumps(chunk.model_dump())}\n\n"
                    i += 1

                yield "data: [DONE]\n\n"
            except Exception as e:

                logging.error(
                    f"Error during response streaming: {repr(e)}\nTraceback:\n{traceback.format_exc()}"
                )
                lf_generation = lf_generation.update(level="WARNING")
                lf_trace = lf_trace.update(level="WARNING")

                # yield f"data: {json.dumps({'error': str(e)})}\n\n"
                yield "data: [DONE]\n\n"

            lf_generation.end(output=complete_output)
            lf_trace = lf_trace.update(output=complete_output)

        return StreamingResponse(
            event_stream(completion, lf_trace, lf_generation),
            media_type="text/event-stream",
        )
    except Exception as e:
        logging.error(
            f"Error during response streaming: {repr(e)}\nTraceback:\n{traceback.format_exc()}"
        )
        message = "Sorry, I was unable to process that"
        lf_trace = lf_trace.update(output=message, level="ERROR")

        return generate_chat_response(message)


@router.post("/manual/chat/completions")
async def get_manual_response(body: ChatCallRequest):
    est_offset = timedelta(hours=-5)
    est = timezone(est_offset)
    current_time = datetime.now(timezone.utc).astimezone(est)
    formatted_time = current_time.strftime("%H:%M:%S:%f")[:-3]
    logging.info(f"{formatted_time} MANUAL: {body.messages[-1].content}")

    return generate_chat_response("Hello! This is a test response.")


@router.get("/ping")
async def ping_custom_llm(
    db: Session = Depends(get_db),
    logging_arg: Literal["info", "error", "none"] = settings.LOGGING_WARMUP_CUSTOM_LLM,
):
    success, data = await warmup_custom_llm(db, logging_arg=logging_arg)
    if not success and (logging_arg == "error" or logging_arg == "info"):
        raise HTTPException(
            status_code=500, detail="Warmup custom llm failed: " + json.dumps(data)
        )
    return data


@router.post("/openai/chat/completions")
async def get_openai_response(body: ChatCallRequest):
    completion = await async_openai_client.chat.completions.create(
        model="gpt-4o-mini",
        messages=body.messages,
        tools=body.tools,
        stream=True,
    )

    async def event_stream():
        try:
            async for chunk in completion:
                yield f"data: {json.dumps(chunk.model_dump())}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as e:
            logging.error(
                f"Error during response streaming: {repr(e)}\nTraceback:\n{traceback.format_exc()}"
            )
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
