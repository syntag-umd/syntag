from datetime import timedelta
import logging
import traceback
from app.routes.squire.barberBookingClient import BarberBookingClient

from app.routes.squire.route import book_appointment
from typing import Optional, Union
from dateutil import parser
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, selectinload
from app.database.tables.user_journal_entry import CallEntry, UserJournalEntry
from app.models.utils import IgnoreValidation
from app.core.config import get_base_url, settings
from app.database.session import get_isolated_db
from app.database.tables.conversation import Conversation
from app.database.tables.message import create_message
from app.database.tables.phone_number import PhoneNumber
from app.database.tables.user import User
from app.database.tables.voice_assistant import VoiceAssistant
from app.models.enums import (
    ChatMedium,
    Language,
)
from app.models.schemas import GetVapiConfigResponse, AppointmentBookingRequest
from app.routes.billing.utils import create_account_balance_invoice
from app.services.analytics.summary import summarize_conversation
from app.services.analytics.review import extract_review
from app.services.vapi.generated_models import (
    AssistantOverrides,
    ServerMessageResponseAssistantRequest,
    ServerMessageResponseToolCalls,
    ServerMessageToolCalls,
    ToolCallResult,
)
from app.services.vapi.vapi_models import (
    ServerMessage,
    ServerMessageResponse,
    ServerMessageAssistantRequest,
)
from app.services.vapi.utils import vapi_secret_header
from app.services.vapi.vapi_models import ServerMessageEndOfCallReport
from app.utils import (
    fetch_vapi_model,
    fetch_vapi_voice,
    get_token_count,
    get_user_from_req,
)
from app.routes.vapi.utils import standardize_time
from app.routes.vapi.tools import create_appointment_tool
from app.utils import admin_key_header, constant_time_compare
from sqlalchemy.orm import joinedload
from datetime import datetime, timedelta
from twilio.rest import Client
from twilio.http.async_http_client import AsyncTwilioHttpClient

import asyncio

router = APIRouter(prefix="/vapi")


@router.post("/get-vapi-config", response_model=GetVapiConfigResponse)
async def get_vapi_config(
    conversation_uuid: str = Query(..., title="The UUID of the conversation"),
    language: Optional[Language] = Query(
        None, title="The language of the conversation (Either ENGLISH or SPANISH)"
    ),
    end_message: Optional[str] = Query(
        None, title="The message to send when the conversation ends"
    ),
    fillers_enabled: Optional[bool] = Query(
        True, title="Whether to use fillers in the conversation"
    ),
    first_message: Optional[str] = Query(
        None, title="The first message to send to the conversation"
    ),
    gender: Optional[str] = Query(
        "male", title="The gender of the call bot (either male or female)"
    ),
    user: User = Depends(get_user_from_req),
) -> GetVapiConfigResponse:
    """If this were in the server-url, it could be to dynamically get a vapi assistant.
    We can interject memory at the start of the call. For past callers,
    we could have the first message be hello {caller.name}
    """
    language = language or Language.ENGLISH

    END_MESSAGE = (
        "Thanks for your time. Goodbye!"
        if language == Language.ENGLISH
        else "Gracias por su tiempo. ¡Adiós!"
    )
    FIRST_MESSAGE = (
        "Hello! How can I help you today?"
        if language == Language.ENGLISH
        else "¡Hola! ¿En qué puedo ayudarte hoy?"
    )
    SERVER_URL = "https://api.syntag.ai/vapi/vapi-conversation-response?conversation_uiid={conversation_uuid}"
    RESPONSE_DELAY_SECONDS = 0.4
    SILENCE_TIMEOUT_SECONDS = 30

    vapi_language = "en" if language == Language.ENGLISH else "es"

    model = fetch_vapi_model()

    voice = fetch_vapi_voice(language, gender)

    payload = {
        "endCallMessage": end_message or END_MESSAGE,
        "fillersEnabled": fillers_enabled,
        "firstMessage": first_message or FIRST_MESSAGE,
        "language": vapi_language,
        "model": model,  # error on this line because model is not defined as string
        "responseDelaySeconds": RESPONSE_DELAY_SECONDS,
        "serverUrl": SERVER_URL.format(conversation_uuid=conversation_uuid),
        "silenceTimeoutSeconds": SILENCE_TIMEOUT_SECONDS,
        "serverMessages": [
            "end-of-call-report",
            "status-update",
            "hang",
            "function-call",
            "transcript",
        ],
        "voice": {
            "provider": "azure",
            "voiceId": voice,
        },
    }

    return GetVapiConfigResponse.model_validate(payload)


# Format the time in the requested format
def format_time_readable(date_time):
    def hour_to_string(hour, minute):

        # Combine the string based on the hour and minute
        time_str = f"{hour}:{minute} eastern time"

        return time_str

    # Function to get the day with ordinal suffix
    def day_with_suffix(day):
        if 11 <= day <= 13:
            return f"{day}th"
        else:
            suffix = {1: "st", 2: "nd", 3: "rd"}.get(day % 10, "th")
        return f"{day}{suffix}"

    month = date_time.strftime("%B")  # Full month name
    day = day_with_suffix(date_time.day)
    hour_minute_str = hour_to_string(date_time.hour, date_time.minute)
    period = "am" if date_time.hour < 12 else "pm"

    return f"{month} {day}, {hour_minute_str} {period}"


@router.post("/server-url", response_model=Optional[ServerMessageResponse])
async def server_url(
    body: IgnoreValidation[ServerMessage],
    db: Session = Depends(get_isolated_db),
    base_url=Depends(get_base_url),
    vapi_secret=Depends(vapi_secret_header),
    admin_key=Depends(admin_key_header),
) -> Union[ServerMessageResponse, None]:
    try:
        if not constant_time_compare(
            settings.VAPI_SECRET, vapi_secret
        ) and not constant_time_compare(settings.ADMIN_KEY, admin_key):
            raise HTTPException(status_code=401, detail="Invalid Authentication")

        message_type = body["message"]["type"]
        if message_type == "end-of-call-report":
            eocReport: ServerMessageEndOfCallReport = body["message"]

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

            callId = eocReport["call"]["id"]
            startTime = eocReport["call"].get(
                "startedAt",
                eocReport["call"].get("createdAt", eocReport.get("startedAt")),
            )
            if startTime:
                callStartTime = parser.isoparse(startTime)
            else:
                logging.error(f"No call start time {body}")
                raise HTTPException(
                    status_code=400, detail="Call start time not found in the report"
                )
            endTime = eocReport.get("endedAt", eocReport["call"].get("endedAt"))
            if endTime:
                callEndTime = parser.isoparse(endTime)
            else:
                logging.error(f"No call end time {body}")
                raise HTTPException(
                    status_code=400, detail="Call end time not found in the report"
                )
            callLengthSeconds = int(
                round((callEndTime - callStartTime).total_seconds())
            )

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
                for index, message in enumerate(eocReport["messages"][splice_index:]):
                    db_message = create_message(
                        db,
                        str(conversation.uuid),
                        str(user.uuid),
                        message.get("message", ""),
                        message["role"],
                        get_token_count(message.get("message", "")),
                        callStartTime + timedelta(seconds=message["secondsFromStart"]),
                        current_highest_index + index,
                    )
                    db.add(db_message)
                    db_messages.append(db_message)
                db.flush()

                if assistant:
                    assistant.conversation_duration_sum += callLengthSeconds

                db.flush()
                db.refresh(conversation)

            else:
                tokenCount = 0
                for message in eocReport["messages"]:
                    tokenCount += get_token_count(message.get("message", ""))
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
                for index, message in enumerate(eocReport["messages"]):
                    db_message = create_message(
                        db,
                        str(conversation.uuid),
                        str(user.uuid),
                        message.get("message", ""),
                        message["role"],
                        get_token_count(message.get("message", "")),
                        callStartTime + timedelta(seconds=message["secondsFromStart"]),
                        index - 1,
                    )
                    db.add(db_message)
                    db_messages.append(db_message)

            if assistant.agent_config.get("type") == "squire-review-fetcher":
                
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
                    message = await client.messages.create_async(
                        body=f"Hey, this is {shop_name}. Thanks for chatting about your experience with us! We’d love it if you could leave us a review - it would mean a lot!",
                        from_=assistant_pn,
                        to=caller_pn
                    )
                    
                    await asyncio.sleep(2)

                    message = await client.messages.create_async(
                        body="To help you out, I drafted up a little something of a review based on our conversation.",
                        from_=assistant_pn,
                        to=caller_pn
                    )
                    
                    await asyncio.sleep(2)

                    message = await client.messages.create_async(
                        body=review,
                        from_=assistant_pn,
                        to=caller_pn
                    )
                    
                    await asyncio.sleep(2)

                    message = await client.messages.create_async(
                        body=f"I recommend you copy the review so it's handy if you decide to submit it! Here's a link to our Google Reviews page: {google_reviews_link}",
                        from_=assistant_pn,
                        to=caller_pn
                    )
                    
                    await asyncio.sleep(2)

                    message = await client.messages.create_async(
                        body="Thanks for your time today. Goodbye!",
                        from_=assistant_pn,
                        to=caller_pn
                    )
                                        
                else:
                    # Flow for customers not willing to leave a review
                    message = await client.messages.create_async(
                        body=f"Hey, this is {shop_name}. Thanks for chatting about your experience with us! If you change your mind and want to leave a review, just let us know!",
                        from_=assistant_pn,
                        to=caller_pn
                    )
            
            summary = summarize_conversation(db_messages)
            conversation.summary = summary

            COST_PER_SECOND = 8 / 3600
            callCost = callLengthSeconds * COST_PER_SECOND

            callCostDollars = round(callCost, 2)

            type_data = CallEntry(
                vapiCallId=callId, conversationUuid=str(conversation.uuid)
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

            db.commit()

            return None

        elif message_type == "assistant-request":
            assistantRequest: ServerMessageAssistantRequest = body["message"]
            vapiPhoneNumber = assistantRequest["phoneNumber"]

            query = (
                select(PhoneNumber)
                .where(
                    or_(
                        PhoneNumber.pn == vapiPhoneNumber.get("number"),
                        PhoneNumber.vapi_phone_number_id == vapiPhoneNumber.get("id"),
                    )
                )
                .options(
                    joinedload(PhoneNumber.voice_assistant),
                    joinedload(PhoneNumber.user),
                )
            )
            db_phone_number = db.execute(query).scalar()

            if not db_phone_number:
                raise HTTPException(status_code=400, detail="Phone number not found")

            if not db_phone_number.voice_assistant:
                logging.error("No assistant found for phone number")
                return ServerMessageResponse(
                    messageResponse=ServerMessageResponseAssistantRequest(
                        error="This phone number is not associated with an assistant. Goodbye",
                    )
                )

            user = db_phone_number.user
            if user.account_balance <= 0:
                return ServerMessageResponse(
                    messageResponse=ServerMessageResponseAssistantRequest(
                        error="The number you are calling is out of money. Goodbye",
                    )
                )

            if db_phone_number.voice_assistant.agent_config.get("type") == "squire":
                vapi_config = db_phone_number.voice_assistant.vapi_config
                if not vapi_config:
                    logging.error("No vapi_config found for squire agent")
                    return ServerMessageResponse(
                        messageResponse=ServerMessageResponseAssistantRequest(
                            error="This phone number is not associated with an assistant. Goodbye",
                        )
                    )

                model = vapi_config.get("model", {})
                # messages = model.get("messages", [])
                messages = []

                shop_name = db_phone_number.voice_assistant.agent_config["shop_name"]

                print(assistantRequest)

                callee_phone_number = assistantRequest["customer"]["number"]

                appointment_tool = create_appointment_tool(
                    shop_name, callee_phone_number
                )

                async with BarberBookingClient(None, shop_name) as client:
                    prompt = await client.get_prompt()
                    prompt.format(assistant_name=db_phone_number.voice_assistant.name)

                    messages.append({"role": "system", "content": prompt})
                    model["messages"] = messages
                    model["tools"] = [appointment_tool]

                    return ServerMessageResponse(
                        messageResponse=ServerMessageResponseAssistantRequest(
                            assistantId=db_phone_number.voice_assistant.vapi_assistant_id,
                            assistantOverrides=AssistantOverrides(model=model),
                        )
                    )

            return ServerMessageResponse(
                messageResponse=ServerMessageResponseAssistantRequest(
                    assistantId=db_phone_number.voice_assistant.vapi_assistant_id,
                )
            )

            utc_time = datetime.utcnow()
            eastern_offset = timedelta(hours=-4)
            eastern_time = utc_time + eastern_offset
            formatted_time = format_time_readable(eastern_time)
            assistant_overrides = AssistantOverrides(
                firstMessage=f"The time is {formatted_time}. How can I help you?"
            )

            return ServerMessageResponse(
                messageResponse=ServerMessageResponseAssistantRequest(
                    assistantId=db_phone_number.voice_assistant.vapi_assistant_id,
                    assistantOverrides=assistant_overrides,
                )
            )

        elif message_type == "tool-calls":
            toolMessage: ServerMessageToolCalls = body["message"]

            utc_time = datetime.utcnow()
            eastern_offset = timedelta(hours=-4)
            eastern_time = utc_time + eastern_offset
            formatted_time = format_time_readable(eastern_time)

            account_sid = settings.TWILIO_ACCOUNT_SID
            auth_token = settings.TWILIO_AUTH_TOKEN
            client = Client(account_sid, auth_token)

            results = []
            for toolCall in toolMessage["toolCallList"]:

                tool_call_id = toolCall["id"]
                function_name = toolCall["function"]["name"]
                function_args = toolCall["function"]["arguments"]

                print(toolCall)
                print(function_name)
                print(function_args)

                if function_name == "send_to_address":

                    phone_number = function_args["phone_number"]
                    print(toolCall)

                    message = client.messages.create(
                        from_="whatsapp:+14155238886",
                        body="Please book your appointment with Today's Hair here: https://getsquire.com/discover/barbershop/370f1443-c506-4c20-b725-ef1d1443a943",
                        to="whatsapp:" + phone_number,
                    )

                    result = ToolCallResult(
                        toolCallId=tool_call_id,
                        name=function_name,
                        result="Your appointment is booked at " + formatted_time,
                        # message does not work
                    )
                    results.append(result)

                elif function_name == "book_squire_appointment":

                    # Get the appointment details
                    shop_name = function_args["shopName"]
                    barber_order_index = function_args["barberOrderIndex"]
                    service_name = function_args["serviceName"]
                    day = function_args["day"]
                    time = standardize_time(function_args["time"])
                    first_name = function_args["firstName"]
                    last_name = function_args["lastName"]
                    email = function_args.get("email", "vikram@syntag.ai")
                    phone_number = function_args["phoneNumber"]

                    appointmentBookingRequest = AppointmentBookingRequest(
                        barberOrderIndex=barber_order_index,
                        serviceName=service_name,
                        day=day,
                        time=time,
                        firstName=first_name,
                        lastName=last_name,
                        email=email,
                        phoneNumber=phone_number,
                    )

                    result = await book_appointment(
                        shop_name, appointmentBookingRequest
                    )

                    results.append(result.json())

                else:
                    # Handle unknown function names
                    result = ToolCallResult(
                        toolCallId=tool_call_id,
                        name=function_name,
                        result=f"Function '{function_name}' is not recognized.",
                    )
                    results.append(result)

            print(results)

            return ServerMessageResponse(
                messageResponse=ServerMessageResponseToolCalls(results=results)
            )

        else:
            return None
    except Exception as e:
        raise HTTPException(
            status_code=500, detail="Error processing server message from vapi"
        ) from e
