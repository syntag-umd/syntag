from datetime import timedelta
import logging
import traceback
from dateutil import parser
from fastapi import HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session, selectinload
from app.database.tables.user_journal_entry import CallEntry, UserJournalEntry
from app.database.tables.conversation import Conversation
from app.database.tables.message import create_message
from app.database.tables.phone_number import PhoneNumber
from app.database.tables.voice_assistant import VoiceAssistant
from app.models.enums import ChatMedium, Language
from app.services.analytics.summary import summarize_conversation
from app.services.analytics.review import extract_review
from app.services.vapi.generated_models import ServerMessageEndOfCallReport
from app.utils import get_token_count
from app.core.config import settings
from datetime import datetime
from twilio.rest import Client
from twilio.http.async_http_client import AsyncTwilioHttpClient
import asyncio
from app.services.billing import create_account_balance_invoice

def get_assistant_and_user(eocReport, db):
    assistant = (
        db.query(VoiceAssistant)
        .filter(
            VoiceAssistant.vapi_assistant_id == eocReport["call"]["assistantId"]
        )
        .options(
            selectinload(VoiceAssistant.phone_number),
            selectinload(VoiceAssistant.user),
        )
        .first()
    )
    if assistant:
        user = assistant.user
        return assistant, user
    else:
        if not eocReport.get("phoneNumber"):
            raise HTTPException(
                status_code=400, detail="No Assistant or Phone number found"
            )

        phoneNumber = (
            db.query(PhoneNumber)
            .filter(
                or_(
                    PhoneNumber.pn == eocReport["phoneNumber"].get("number"),
                    PhoneNumber.vapi_phone_number_id
                    == eocReport["phoneNumber"].get("id"),
                )
            )
            .options(
                selectinload(PhoneNumber.voice_assistant),
                selectinload(PhoneNumber.user),
            )
            .first()
        )
        if not phoneNumber:
            raise HTTPException(
                status_code=400, detail="No Assistant or Phone number found"
            )

        user = phoneNumber.user
        return None, user

def parse_call_times(eocReport):
    callId = eocReport["call"]["id"]
    startTime = eocReport["call"].get(
        "startedAt",
        eocReport["call"].get("createdAt", eocReport.get("startedAt")),
    )
    if startTime:
        callStartTime = parser.isoparse(startTime)
    else:
        logging.error(f"No call start time {eocReport}")
        raise HTTPException(
            status_code=400, detail="Call start time not found in the report"
        )
    endTime = eocReport.get("endedAt", eocReport["call"].get("endedAt"))
    if endTime:
        callEndTime = parser.isoparse(endTime)
    else:
        logging.error(f"No call end time {eocReport}")
        raise HTTPException(
            status_code=400, detail="Call end time not found in the report"
        )
    callLengthSeconds = int(
        round((callEndTime - callStartTime).total_seconds())
    )
    return callId, callStartTime, callEndTime, callLengthSeconds

def process_messages(conversation_uuid, eocReport_messages, db, user_uuid, callStartTime, starting_index):
    db_messages = []
    for index, message in enumerate(eocReport_messages):
        db_message = create_message(
            db,
            conversation_uuid,
            user_uuid,
            message.get("message", ""),
            message["role"],
            get_token_count(message.get("message", "")),
            callStartTime + timedelta(seconds=message["secondsFromStart"]),
            starting_index + index + 1,  # Ensure the index increments correctly
        )
        db.add(db_message)
        db_messages.append(db_message)
    return db_messages

def fetch_or_create_conversation(eocReport, db, assistant, user, callId, callStartTime, callLengthSeconds):
    conversation = (
        db.query(Conversation)
        .filter(Conversation.vapiCallId == callId)
        .options(selectinload(Conversation.messages))
        .first()
    )
    db_messages = []
    if conversation:
        if len(conversation.messages) == 0:
            current_highest_index = -1
        else:
            current_highest_index = max(
                conversation.messages, key=lambda msg: msg.index
            ).index
        splice_index = current_highest_index + 1
        db_messages = conversation.messages.copy()
        messages_to_process = eocReport["messages"][splice_index:]
        new_messages = process_messages(
            str(conversation.uuid),
            messages_to_process,
            db,
            str(user.uuid),
            callStartTime,
            current_highest_index
        )
        db_messages.extend(new_messages)
        if assistant:
            assistant.conversation_duration_sum += callLengthSeconds

        db.flush()
        db.refresh(conversation)

    else:
        tokenCount = sum(get_token_count(message.get("message", "")) for message in eocReport["messages"])
        caller_pn = eocReport["call"].get("customer", {}).get("number")
        if eocReport["call"].get("type") == "inboundPhoneCall":
            medium = ChatMedium.PHONE
        else:
            medium = ChatMedium.VOICECHAT

        if assistant:
            assistant.conversation_duration_sum += callLengthSeconds

        conversation = Conversation(
            createdAt=callStartTime,
            userUuid=user.uuid,
            language=Language.ENGLISH,
            medium=medium,
            tokenCount=tokenCount,
            vapiCallId=callId,
            caller_pn=caller_pn,
            durationInSeconds=callLengthSeconds,
        )
        if eocReport.get("phoneNumber"):
            conversation.assistant_pn = eocReport["phoneNumber"].get("number")

        if assistant:
            conversation.voice_assistant_uuid = assistant.uuid

        db.add(conversation)
        db.flush()
        db.refresh(conversation)

        new_messages = process_messages(
            str(conversation.uuid),
            eocReport["messages"],
            db,
            str(user.uuid),
            callStartTime,
            -1
        )
        db_messages.extend(new_messages)
    return conversation, db_messages

async def handle_squire_review_fetcher(eocReport, assistant):
    conversation_string = ""
    for index, message in enumerate(eocReport["messages"]):
        message_content = message.get("message", "")
        message_role = message['role']
        conversation_string += f"{message_role}: {message_content}\n"

    shop_name = assistant.agent_config["shop_name"]
    google_reviews_link = assistant.agent_config["google_reviews_link"]

    caller_pn = eocReport["call"].get("customer", {}).get("number")
    assistant_pn = eocReport["phoneNumber"].get("number")

    # make an OpenAI request to fetch a user review from the conversation
    review_details = extract_review(conversation_string, shop_name)

    # extract the review, and their willingness to review
    review = review_details["review"]
    willing_to_leave_review = review_details["willing_to_leave_review"]

    # Text the review to the caller if willing
    account_sid = settings.TWILIO_ACCOUNT_SID
    auth_token = settings.TWILIO_AUTH_TOKEN

    http_client = AsyncTwilioHttpClient()
    client = Client(account_sid, auth_token, http_client=http_client)

    if willing_to_leave_review:
        # Flow for customers willing to leave a review
        messages = [
            f"Hey, this is {shop_name}. Thanks for chatting about your experience with us! We’d love it if you could leave us a review - it would mean a lot!",
            "To help you out, I drafted up a little something of a review based on our conversation.",
            review,
            f"I recommend you copy the review so it's handy if you decide to submit it! Here's a link to our Google Reviews page: {google_reviews_link}",
            "Thanks for your time today. Goodbye!",
        ]
    else:
        # Flow for customers not willing to leave a review
        messages = [
            f"Hey, this is {shop_name}. Thanks for chatting about your experience with us! If you change your mind and want to leave a review, just let us know!"
        ]

    # Send messages asynchronously with pauses
    for msg in messages:
        await client.messages.create_async(
            body=msg,
            from_=assistant_pn,
            to=caller_pn
        )
        await asyncio.sleep(2)

def update_user_account(conversation, callLengthSeconds, user, db):
    COST_PER_SECOND = 8 / 3600
    callCost = callLengthSeconds * COST_PER_SECOND
    callCostDollars = round(callCost, 2)

    type_data = CallEntry(
        vapiCallId=conversation.vapiCallId, conversationUuid=str(conversation.uuid)
    )
    new_entry = UserJournalEntry(
        amount=-callCostDollars,
        userUuid=user.uuid,
        type="call",
        type_data=type_data,
    )
    user.account_balance -= callCostDollars
    db.add(new_entry)

    try:
        create_account_balance_invoice(user)
    except Exception as e:
        logging.error(
            f"Error creating invoice for user: {str(user.uuid)} {repr(e)}\nTraceback:\n{traceback.format_exc()}"
        )

async def handle_end_of_call_report(eocReport: ServerMessageEndOfCallReport, db: Session) -> ServerMessageResponse:
    assistant, user = get_assistant_and_user(eocReport, db)
    callId, callStartTime, callEndTime, callLengthSeconds = parse_call_times(eocReport)
    conversation, db_messages = fetch_or_create_conversation(
        eocReport, db, assistant, user, callId, callStartTime, callLengthSeconds
    )
    
    if assistant and assistant.agent_config.get("type") == "squire-review-fetcher":
        await handle_squire_review_fetcher(eocReport, assistant)

    summary = summarize_conversation(db_messages)
    conversation.summary = summary

    update_user_account(conversation, callLengthSeconds, user, db)

    db.commit()
    return None
