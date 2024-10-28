from datetime import datetime, timedelta
import logging
from typing import Union
from fastapi import HTTPException
from sqlalchemy import or_, select
from sqlalchemy.orm import Session, joinedload
from app.database.tables.phone_number import PhoneNumber
from app.services.vapi.vapi_models import (
    ServerMessageResponse,
    ServerMessageResponseAssistantRequest,
)
from app.services.vapi.generated_models import AssistantOverrides
from app.routes.vapi.tools import (
    create_appointment_tool,
    create_fetch_next_opening_tool,
    create_fetch_availability_on_day_tool,
    create_check_walkin_availability_tool,
    create_get_barber_for_appointment_tool,
)
from app.routes.squire.barberBookingClient import BarberBookingClient
from app.routes.vapi.utils import format_time_readable


def get_db_phone_number(assistant_request, db: Session) -> PhoneNumber:
    """Retrieve the phone number record from the database."""
    vapi_phone_number = assistant_request["phoneNumber"]
    query = (
        select(PhoneNumber)
        .where(
            or_(
                PhoneNumber.pn == vapi_phone_number.get("number"),
                PhoneNumber.vapi_phone_number_id == vapi_phone_number.get("id"),
            )
        )
        .options(
            joinedload(PhoneNumber.voice_assistant),
            joinedload(PhoneNumber.user),
        )
    )
    db_phone_number = db.execute(query).scalar()
    return db_phone_number


def check_account_balance(user) -> bool:
    """Check if the user's account balance is sufficient."""
    return user.account_balance > 0


def handle_insufficient_balance_response() -> ServerMessageResponse:
    """Return a response indicating insufficient account balance."""
    return ServerMessageResponse(
        messageResponse=ServerMessageResponseAssistantRequest(
            error="The number you are calling is out of money. Goodbye",
        )
    )


def handle_no_assistant_response() -> ServerMessageResponse:
    """Return a response indicating no assistant is associated with the phone number."""
    logging.error("No assistant found for phone number")
    return ServerMessageResponse(
        messageResponse=ServerMessageResponseAssistantRequest(
            error="This phone number is not associated with an assistant. Goodbye",
        )
    )


def handle_default_assistant(db_phone_number) -> ServerMessageResponse:
    """Handle the default assistant response."""
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


async def get_prompt_and_update_config(
    assistant_config, db_phone_number, db
) -> str:
    """Retrieve the prompt and update the assistant configuration."""
    async with BarberBookingClient(None, assistant_config["shop_name"]) as client:
        prompt_and_assistant_config = await client.get_prompt_and_assistant_config()

        barber_names_to_ids = assistant_config["barber_names_to_ids"]
        services = assistant_config["service_types"]
        timezone_str = assistant_config["timezone"]
        extra_prompts = assistant_config.get("extra_prompts", [])

        # Update assistant_config
        assistant_config["barber_names_to_ids"] = barber_names_to_ids
        assistant_config["service_types"] = services
        assistant_config["timezone"] = timezone_str

        db_phone_number.voice_assistant.agent_config = assistant_config
        db.commit()

        prompt = prompt_and_assistant_config["prompt"].format(
            assistant_name=db_phone_number.voice_assistant.name
        )

        for message in extra_prompts:
            prompt += "\n" + message

        return prompt


def create_tools(
    shop_name, callee_phone_number, service_types, barber_names
) -> list:
    """Create a list of tools for the assistant."""
    return [
        create_appointment_tool(shop_name, callee_phone_number),
        create_fetch_next_opening_tool(service_types, barber_names),
        create_fetch_availability_on_day_tool(service_types, barber_names),
        create_check_walkin_availability_tool(),
        create_get_barber_for_appointment_tool(service_types, barber_names),
    ]


async def handle_squire_assistant(
    assistant_config, db_phone_number, assistant_request, db
) -> ServerMessageResponse:
    """Handle the 'squire' type assistant."""
    vapi_config = db_phone_number.voice_assistant.vapi_config
    if not vapi_config:
        logging.error("No vapi_config found for squire agent")
        return handle_no_assistant_response()

    model = vapi_config.get("model", {})
    messages = []

    shop_name = assistant_config["shop_name"]
    service_types = assistant_config["service_types"]
    barber_name_to_ids = assistant_config["barber_names_to_ids"]
    barber_names = list(barber_name_to_ids.keys())

    print(assistant_request)

    callee_phone_number = assistant_request["customer"]["number"]

    # Create tools
    tools = create_tools(
        shop_name, callee_phone_number, service_types, barber_names
    )

    # Get prompt and update config
    prompt = await get_prompt_and_update_config(
        assistant_config, db_phone_number, db
    )
    messages.append({"role": "system", "content": prompt})

    model["messages"] = messages
    model["tools"] = tools

    return ServerMessageResponse(
        messageResponse=ServerMessageResponseAssistantRequest(
            assistantId=db_phone_number.voice_assistant.vapi_assistant_id,
            assistantOverrides=AssistantOverrides(model=model),
        )
    )


async def handle_assistant_request(
    assistant_request: ServerMessageAssistantRequest, db: Session
) -> ServerMessageResponse:
    """Main handler for assistant requests."""
    db_phone_number = get_db_phone_number(assistant_request, db)
    if not db_phone_number:
        raise HTTPException(status_code=400, detail="Phone number not found")

    if not db_phone_number.voice_assistant:
        return handle_no_assistant_response()

    user = db_phone_number.user
    if not check_account_balance(user):
        return handle_insufficient_balance_response()

    assistant_config = db_phone_number.voice_assistant.agent_config
    assistant_type = assistant_config.get("type")

    if assistant_type == "squire":
        return await handle_squire_assistant(
            assistant_config, db_phone_number, assistant_request, db
        )
    else:
        return handle_default_assistant(db_phone_number)
