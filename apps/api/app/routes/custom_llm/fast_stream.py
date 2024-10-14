# We will create a hyperfast text stream using
# promise races. The concept relies on the following
# 3 "content generation machines":
# 1. Vector Databases: Used to prompt the fast model
#    to generate an accurate response.
# 2. Fast Model: A model that can generate a response
#    quickly. If there are vectors to reference,
#    we will trust the fast model with the full response.
#    Otherwise, the fast model will be used to frontload
#    the start of the stream, and the slow model will
#    be used to generate the rest of the stream.
# 3. Slow Model: A model that can generate a defacto,
#    accurate response. This model is slower than the
#    fast model and only referenced when the fast model
#    is not confident in the response.

# Later on, we will build verification metrics that will
# update our vector embeddings in the case that they become
# stale. We can determine the age of the vector embeddings
# and if they exceed a day or a week, we'll run the slow model
# on the conversation. If the responses are significantly
# different, we'll update the vector embeddings. If there is
# a file update, we can update the vector embeddings by
# deleting vectors related to the changed portion (we can
# use git for comparison).

# Our first endpoint will be fast-stream. Take as input
# the current conversation, the slow model and the fast
# model. If the fast model is an assistant, also take
# in the assistant-id. Then, the logic will be similar
# to the logic in https://github.com/syntag-umd/api/compare/main...custom-llm-url

# flake8: noqa: F841
import json
import logging
from app.database.tables.user import User
from app.services.conversation_queue import ConversationQueue
from app.utils import get_user_from_req
from fastapi import Depends, HTTPException, Request, Path
from sqlalchemy.orm import Session
from fastapi.responses import StreamingResponse, JSONResponse
import tiktoken
from openai import AsyncOpenAI
import asyncio
from app.database.session import get_db
from app.services.cache import Cache
from app.core.config import settings

async_openai_client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)


async def get_topk_embeddings(
    messages, embeddings_event, search_pipe_id, embeddings_queue, k=5, min_distance=0.5
):
    """
    Function to get top K embeddings based on user messages and set the result to an output parameter.

    Args:
        messages (list): List of messages containing the conversation history.
        embeddings_event (Event): Event object to signal when an embedding is found.
        search_pipe_id (str): The ID of the search pipeline.
        output_param (dict): A dictionary to store the embedding text that can be accessed by an external process.
        k (int): Number of top embeddings to retrieve. Default is 5.
        min_distance (float): Minimum distance threshold for embeddings. Default is 0.5.

    Returns:
        None
    """
    # Get content of last message by user
    query = ""
    on_user_messages = False

    for message in reversed(messages):
        on_user_messages = on_user_messages or message["role"] == "user"
        if on_user_messages:
            if message["role"] != "user":
                break
            query += message["content"] + "\n"

    # Query the embeddings
    # results = await EmbeddingsClient().query(
    #     search_pipe_id=search_pipe_id, query=query, top_k=k
    # )
    results = []
    # Check the results and set the output parameter if a suitable embedding is found
    for embedding in results:
        if embedding["distance"] > min_distance:
            # Set the embedding text to the output parameter
            embeddings_queue.add_phrase(embedding["text"])
            # Signal that an embedding has been found
            embeddings_event.set()


async def get_completion(model, messages, max_tokens, temperature, queue, event):
    async for token in await async_openai_client.chat.completions.create(
        model=model,
        messages=messages,
        max_tokens=max_tokens,
        temperature=temperature,
        stream=True,
    ):
        queue.add_tok_unformatted(token.choices[0].delta.content)
        if queue.has_next_phrase() and len(queue) > 10:
            # set async event to true
            event.set()


async def generate_streaming_response(
    messages,
    model,
    max_tokens,
    temperature,
    search_pipe_id,
    time_per_token=0.12,
):

    # Task 1: get_completion(model, messages, max_tokens, temperature, frontloaded_queue, frontloaded_queue_has_phrase_event)
    # Task 2: get_completion("gpt-4-turbo", messages, max_tokens, temperature, backloaded_queue, backloaded_queue_has_phrase_event)
    # Start both tasks simultaneously.
    # Use a promise race to determine which event is set first.
    # If frontloaded_queue_has_phrase_event is set first:
    # start streaming from the frontloaded_queue
    # when the backloaded_queue_has_phrase_event is set, start the segue prompt
    # when the segue_queue_has_phrase_event is set, start streaming from the segue_queue
    # when the segue queue is finished, start streaming from the backloaded_queue
    # If backloaded_queue_has_phrase_event is set first, start streaming from the backloaded_queue

    frontloaded_queue = ConversationQueue(model)
    backloaded_queue = ConversationQueue("gpt-4-turbo", add_stop=True)
    segue_queue = ConversationQueue("gpt-3.5-turbo")
    said_queue = ConversationQueue(model)
    embeddings_queue = ConversationQueue()

    embedding_available_event = asyncio.Event()
    frontloaded_queue_has_phrase_event = asyncio.Event()
    backloaded_queue_has_phrase_event = asyncio.Event()
    segue_queue_has_phrase_event = asyncio.Event()

    asyncio.create_task(
        get_topk_embeddings(
            messages,
            embedding_available_event,
            search_pipe_id,
            embeddings_queue,
            k=5,
            min_distance=0.1,
        )
    )

    # Start the frontloaded queue
    asyncio.create_task(
        get_completion(
            model,
            messages,
            max_tokens,
            temperature,
            frontloaded_queue,
            frontloaded_queue_has_phrase_event,
        )
    )

    # Start the backloaded queue
    asyncio.create_task(
        get_completion(
            "gpt-4-turbo",
            messages,
            max_tokens,
            temperature,
            backloaded_queue,
            backloaded_queue_has_phrase_event,
        )
    )

    # Behavior cases:
    # Vector embeddings finishes first:
    # Use vector result as frontloaded queue
    # Start segue model when backloaded queue is ready to go
    # Stream from segue model
    # Stream from backloaded queue.
    # Frontloaded model (GPT3.5) finishes first:
    # Use frontloaded model as frontloaded queue
    # Start segue model when backloaded queue is ready to go
    # Stream from segue model
    # Stream from backloaded queue.
    # Backloaded model (GPT4) finished first:
    # Stream from backloaded model.

    done, pending = await asyncio.wait(
        [
            embedding_available_event.wait(),
            frontloaded_queue_has_phrase_event.wait(),
            backloaded_queue_has_phrase_event.wait(),
        ],
        return_when=asyncio.FIRST_COMPLETED,
    )

    # Case 1: embedding_event is set first
    if (
        embedding_available_event.is_set()
        or frontloaded_queue_has_phrase_event.is_set()
    ):

        if frontloaded_queue_has_phrase_event.is_set():
            logging.info("Frontloaded event is set")
            current_queue = frontloaded_queue

        else:
            logging.info("Embedding event is set")
            current_queue = embeddings_queue

        # Start yielding phrases from the frontloaded queue until the segue event is set
        # in an asynchronous manner.
        while not backloaded_queue_has_phrase_event.is_set():
            next_phrase = current_queue.next_phrase()
            if not next_phrase:
                await asyncio.sleep(time_per_token)
            else:
                for token in next_phrase:
                    yield f"data: {json.dumps(token)}\n\n"
                    said_queue.add_tok_unformatted(
                        token["choices"][0]["delta"]["content"]
                    )
                await asyncio.sleep(time_per_token * len(next_phrase))

        segue_messages = [
            {
                "role": "user",
                "content": f"Limit your output to a single sentence that seamlessly connects these two phrases. \n\n Phrase 1: {str(current_queue)} \n Phrase 2: {str(backloaded_queue)}",
            }
        ]

        asyncio.create_task(
            get_completion(
                "gpt-3.5-turbo",
                segue_messages,
                max_tokens,
                temperature,
                segue_queue,
                segue_queue_has_phrase_event,
            )
        )

        while not segue_queue_has_phrase_event.is_set():
            next_phrase = current_queue.next_phrase()
            if not next_phrase:
                await asyncio.sleep(time_per_token)
            else:
                for token in next_phrase:
                    yield f"data: {json.dumps(token)}\n\n"
                    said_queue.add_tok_unformatted(
                        token["choices"][0]["delta"]["content"]
                    )
                await asyncio.sleep(time_per_token * len(next_phrase))

        # Yield all phrases from the segue queue
        while not segue_queue.has_ended_speaking():
            next_phrase = segue_queue.next_phrase()
            if not next_phrase:
                await asyncio.sleep(time_per_token)
            else:
                for token in next_phrase:
                    yield f"data: {json.dumps(token)}\n\n"
                    said_queue.add_tok_unformatted(
                        token["choices"][0]["delta"]["content"]
                    )
                    await asyncio.sleep(time_per_token)
                await asyncio.sleep(time_per_token * len(next_phrase))

        # Yield all phrases from the backloaded queue
        while not backloaded_queue.has_ended_speaking():
            next_phrase = backloaded_queue.next_phrase()
            if not next_phrase:
                await asyncio.sleep(time_per_token)
            else:
                for token in next_phrase:
                    yield f"data: {json.dumps(token)}\n\n"
                    said_queue.add_tok_unformatted(
                        token["choices"][0]["delta"]["content"]
                    )
                    await asyncio.sleep(time_per_token)
                await asyncio.sleep(time_per_token * len(next_phrase))

    # Case 3: backloaded_event is set first
    elif backloaded_queue_has_phrase_event.is_set():

        logging.info("Backloaded event is set")

        # Yield all phrases from the backloaded queue
        while not backloaded_queue.has_ended_speaking():
            next_phrase = backloaded_queue.next_phrase()
            if not next_phrase:
                await asyncio.sleep(time_per_token)
            else:
                for token in next_phrase:
                    yield f"data: {json.dumps(token)}\n\n"
                    said_queue.add_tok_unformatted(
                        token["choices"][0]["delta"]["content"]
                    )
                await asyncio.sleep(time_per_token * len(next_phrase))

    # # Cancel all tasks
    # for task in pending:
    #     task.cancel()
    logging.info(str(said_queue))


# @router.post("/chat/completions")
async def get_response(
    request: Request,
    user: User = Depends(get_user_from_req),
    db: Session = Depends(get_db),
):
    embeddings = user.embeddings
    if not embeddings:
        return {
            "message": "User does not have embeddings cluster. Please onboard first."
        }

    search_pipe_id = embeddings[0].search_pipeline_id

    json_request = await request.json()

    call = json_request.get("call")
    if call is None:
        raise HTTPException(status_code=400, detail="Invalid request")
    conversation_id = call.get("id")
    if conversation_id is None:
        raise HTTPException(status_code=400, detail="Invalid request")

    conversation_object = Cache.get(
        conversation_id,
        {
            "conversation": [],
            "content": None,
        },
    )

    messages = json_request.get("messages", [])
    conversation_object["conversation"] = [
        message for message in messages if message.get("role") in ["assistant", "user"]
    ]
    Cache.set(conversation_id, conversation_object)

    model = json_request.get("model", "gpt-3.5-turbo")
    max_tokens = json_request.get("max_tokens", 150)
    temperature = json_request.get("temperature", 0.7)
    stream = json_request.get("stream", False)

    if stream:

        # Start streaming the response
        response_generator = generate_streaming_response(
            messages, model, max_tokens, temperature, search_pipe_id
        )

        headers = {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }

        return StreamingResponse(response_generator, headers=headers)

    else:
        completion = await async_openai_client.chat.completions.create(
            model=model,
            messages=messages,
            max_tokens=max_tokens,
            temperature=temperature,
            stream=stream,
        )

        return JSONResponse(content=completion)
