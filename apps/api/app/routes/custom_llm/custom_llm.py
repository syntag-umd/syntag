import json
import logging
import time
import copy
from typing import List, Literal
from sqlalchemy import update
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
from openai import AsyncOpenAI
from app.services.pinecone.utils import pc_index
from app.database.session import get_db
from app.core.config import settings
import asyncio
from app.services.openai.utils import azure_text3large_embedding, azure_gpt4o_mini
import traceback
from datetime import datetime, timedelta, timezone

OPENAI_API_KEY = settings.OPENAI_API_KEY

async_openai_client = AsyncOpenAI(api_key=OPENAI_API_KEY)


router = APIRouter(prefix="/custom-llm")


@router.post("/fast/chat/completions")
async def get_fast_response(
    # request: Request,
    body: ChatCallRequest,
    db: Session = Depends(get_db),
):
    logging.info("===custom llm===")
    start_request = time.time()

    try:
        body_messages: List[Message] = body.messages

        # body_messages_content = [message.content for message in body_messages if message.role != "tool"]
        last_message = body_messages[-1]
        logging.info(f"{last_message['role']}: {last_message.get('content')}")

        top_k: int = 10

        vapi_assistant_id = body.call.assistantId

        async def db_calls():
            start_db_query = time.time()

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

            user_uuid = str(voice_assistant.user.uuid)
            knowledge = voice_assistant.knowledge
            knowledge_uuids = [str(kn.uuid) for kn in knowledge]
            db_query_time = time.time() - start_db_query
            logging.info(f"DB Query Time: {round(db_query_time * 1000)}")

            return user_uuid, knowledge_uuids, convo

        async def embed_convo():

            conversation_content = truncate_conversation(body_messages)

            embed_start = time.time()
            embedded = await azure_text3large_embedding.embeddings.create(
                input=conversation_content,
                model="text-embedding-3-large",
            )
            embed_time = time.time() - embed_start
            logging.info(f"Embedding Time: {round(embed_time * 1000)}")
            return embedded

        embed_convo_task = asyncio.create_task(embed_convo())
        get_uuids_task = asyncio.create_task(db_calls())

        await asyncio.gather(embed_convo_task, get_uuids_task)
        embedded = embed_convo_task.result()
        (user_uuid, knowledge_uuids, convo) = get_uuids_task.result()
        convo_cache = convo.cache
        if not convo_cache:
            convo_cache: ConversationCache = {"previously_injected_chunk_ids": []}

        try:
            query_top_k = top_k + len(convo_cache["previously_injected_chunk_ids"])
            vector = embedded.data[0].embedding
            query_start = time.time()
            query_result = pc_index.query(
                vector=vector,
                namespace=user_uuid,
                top_k=query_top_k,
                filter={"knowledge_uuid": {"$in": knowledge_uuids}},
                include_metadata=True,
                timeout=1,
            )
            query_time = time.time() - query_start
            logging.info(f"Pinecone Query Time: {round(query_time * 1000)}")

            chunks = []
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
                    if chunk_id not in convo_cache["previously_injected_chunk_ids"]:
                        count_new_chunks += 1
                        convo_cache["previously_injected_chunk_ids"].append(chunk_id)
                    chunks.append(chunk_id)
                else:
                    # print("Score too low", score, user_uuid + "#"+ str(chunk_id) )
                    pass
        except Exception as e:
            logging.error(
                f"Error during Pinecone query: {repr(e)}\nTraceback:\n{traceback.format_exc()}"
            )
            chunks = []

        if len(chunks) > 0:
            chunks = chunks[:top_k]
            chunks.reverse()
            get_chunks_start = time.time()
            chunk_results = db.query(Chunk).filter(Chunk.id.in_(chunks)).all()
            hit_knowledge_uuids = [chunk.knowledgeUuid for chunk in chunk_results]
            knowledge_results = (
                db.query(Knowledge)
                .filter(Knowledge.uuid.in_(hit_knowledge_uuids))
                .all()
            )

            get_chunks_time = round((time.time() - get_chunks_start) * 1000)

            logging.info(
                f"Chunk content time: {get_chunks_time} for {len(chunk_results)} chunks",
            )

            system_message = "Search results found the following information that might be relevent: "

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

        async def azure_gpt_4o_mini_request():
            completion = await azure_gpt4o_mini.chat.completions.create(
                model="gpt-4o-mini",
                messages=messsages,
                tools=body.tools,
                stream=True,
            )
            return ("azure-gpt-4o-mini", completion)

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

        start_openai_request = time.time()

        tasks = [
            asyncio.create_task(azure_gpt_4o_mini_request()),
            asyncio.create_task(openai_gpt_35_request()),
        ]

        done, pending = await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
        for task in pending:
            task.cancel()
        for task in done:
            name, completion = task.result()

        openai_request_time = time.time() - start_openai_request
        logging.info(f"{name} Request Time: {round(openai_request_time * 1000)}")

        updated_cache = copy.deepcopy(convo_cache)
        cache_statement = (
            update(Conversation)
            .where(Conversation.id == convo.id)
            .values(cache=updated_cache)
            .execution_options(synchronize_session="fetch")
        )
        db.execute(cache_statement)
        db.commit()

        async def event_stream(completion):
            try:
                i = 0
                async for chunk in completion:
                    if i == 0:
                        first_chunk_time = time.time()
                        logging.info(
                            f"LLM time to first chunk: {round((first_chunk_time - start_openai_request) * 1000)}",
                        )
                        logging.info(
                            f"Total time to first chunk: {round((first_chunk_time - start_request) * 1000)}",
                        )

                    yield f"data: {json.dumps(chunk.model_dump())}\n\n"
                    i += 1

                yield "data: [DONE]\n\n"
            except Exception as e:
                logging.error(
                    f"Error during response streaming: {repr(e)}\nTraceback:\n{traceback.format_exc()}"
                )
                # yield f"data: {json.dumps({'error': str(e)})}\n\n"
                yield "data: [DONE]\n\n"

        return StreamingResponse(
            event_stream(completion), media_type="text/event-stream"
        )
    except Exception as e:
        logging.error(
            f"Error during response streaming: {repr(e)}\nTraceback:\n{traceback.format_exc()}"
        )
        logging.info(
            f"Total time to first chunk: {            round((time.time() - start_request) * 1000)}",
        )

        return generate_chat_response("Sorry, I was unable to process that")


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
    if not success and (logging == "error" or logging == "info"):
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
