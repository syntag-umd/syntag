import logging
from typing import List
from app.database.tables.message import Message
from app.models.enums import Role
from app.utils import get_token_count
from app.services.llm import async_openai_client


async def summarize_conversation(db_messages: List[Message]):
    """Summarizes based on the beginning and end of the conversation"""
    model = "gpt-4o-mini"
    cur_tokens = 0
    max_context_window = 128000 - 4000
    user_assistant_messages = [
        i for i in db_messages if i.role == Role.USER or i.role == Role.ASSISTANT
    ]
    start = 0
    end = len(user_assistant_messages) - 1
    start_content: List[str] = []
    end_content: List[str] = []
    while start <= end:
        if start == end:
            msg = user_assistant_messages[start]
            if msg.role == Role.USER:
                t = "User: " + msg.content + "\n"
            elif msg.role == Role.ASSISTANT:
                t = "Assistant: " + msg.content + "\n"
            tokens = get_token_count(t, "gpt-4")
            cur_tokens += tokens
            if cur_tokens > max_context_window:
                break
            start_content.append(t)
        else:
            msg = user_assistant_messages[start]
            if msg.role == Role.USER:
                t = "User: " + msg.content + "\n"
            elif msg.role == Role.ASSISTANT:
                t = "Assistant: " + msg.content + "\n"
            tokens = get_token_count(t, "gpt-4")
            cur_tokens += tokens
            if cur_tokens > max_context_window:
                break
            start_content.append(t)

            msg = user_assistant_messages[end]
            if msg.role == Role.USER:
                t = "User: " + msg.content + "\n"
            elif msg.role == Role.ASSISTANT:
                t = "Assistant: " + msg.content + "\n"
            tokens = get_token_count(t, "gpt-4")
            cur_tokens += tokens
            if cur_tokens > max_context_window:
                break
            end_content.insert(0, t)

        start += 1
        end -= 1

    if cur_tokens > max_context_window:
        transcript = "".join(start_content) + "\n...\n" + "".join(end_content)
    else:
        transcript = "".join(start_content) + "".join(end_content)
    try:
        summary = await async_openai_client.chat.completions.create(
            model=model,
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert note-taker. You will be given a transcript of a call. Your task is to summarize the call. The summary should be 1-3 sentences. Your writing must be concise. Refer to the assistant as assistant, and the user as caller.",
                },
                {"role": "user", "content": transcript},
            ],
            temperature=0.3,
        )
        summary_content = summary.choices[0].message.content
    except Exception as e:
        logging.error(
            f"Error openai summarization: {e}",
        )
        summary_content = None

    return summary_content
