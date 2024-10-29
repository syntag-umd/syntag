from datetime import timedelta, datetime
import logging
from app.routes.squire.barberBookingClient import BarberBookingClient

from app.routes.squire.route import book_appointment
from sqlalchemy.orm import Session, selectinload
from app.database.tables.voice_assistant import VoiceAssistant
from app.models.schemas import AppointmentBookingRequest
from app.core.config import settings
from app.services.vapi.generated_models import (
    ServerMessageToolCalls,
    ToolCallResult,
    ServerMessageResponse,
    ServerMessageResponseToolCalls
)
from app.routes.vapi.utils import format_time_readable, standardize_time
from twilio.rest import Client
from twilio.http.async_http_client import AsyncTwilioHttpClient


async def handle_tool_calls(toolMessage: ServerMessageToolCalls, db: Session) -> ServerMessageResponse:
    assistant = (
        db.query(VoiceAssistant)
        .filter(
            VoiceAssistant.vapi_assistant_id == toolMessage["call"]["assistantId"]
        )
        .options(
            selectinload(VoiceAssistant.phone_number),
            selectinload(VoiceAssistant.user),
        )
        .first()
    )
    
    customer_phone_number = toolMessage["call"]["customer"]["number"]

    assistant_config = assistant.agent_config

    account_sid = settings.TWILIO_ACCOUNT_SID
    auth_token = settings.TWILIO_AUTH_TOKEN
    ahttp_client = AsyncTwilioHttpClient()
    twilio_client = Client(account_sid, auth_token, http_client=ahttp_client)

    results = []

    for toolCall in toolMessage["toolCallList"]:
        tool_call_id = toolCall["id"]
        function_name = toolCall["function"]["name"]
        function_args = toolCall["function"]["arguments"]

        print(toolCall)
        print(function_name)
        print(function_args)

        if function_name == "send_to_address":
            result = await handle_send_to_address(
                tool_call_id, function_args, assistant_config, twilio_client
            )
            results.append(result)
        elif function_name == "fetch_next_opening":
            result = await handle_fetch_next_opening(
                tool_call_id, function_args, assistant_config
            )
            results.append(result)
        elif function_name == "fetch_availability_on_day":
            result = await handle_fetch_availability_on_day(
                tool_call_id, function_args, assistant_config
            )
            results.append(result)
        elif function_name == "check_availability_on_day_and_time":
            result = await handle_check_availability_on_day_and_time(
                tool_call_id, function_args, assistant_config
            )
            results.append(result)
        elif function_name == "check_for_walkin_availability":
            result = await handle_check_for_walkin_availability(
                tool_call_id, function_args, assistant_config
            )
            results.append(result)
        elif function_name == "book_squire_appointment":
            result = await handle_book_squire_appointment(
                tool_call_id, function_args, assistant_config, customer_phone_number
            )
            results.append(result)
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


async def handle_send_to_address(tool_call_id, function_args, assistant_config, twilio_client):
    phone_number = function_args["phone_number"]
    print("Sending to address:", phone_number)

    # Send WhatsApp message via Twilio
    message = await twilio_client.messages.create_async(
        from_="whatsapp:+14155238886",
        body="Please book your appointment with Today's Hair here: https://getsquire.com/discover/barbershop/370f1443-c506-4c20-b725-ef1d1443a943",
        to="whatsapp:" + phone_number,
    )

    # Assuming you want to return a confirmation message
    utc_time = datetime.utcnow()
    eastern_offset = timedelta(hours=-4)
    eastern_time = utc_time + eastern_offset
    formatted_time = format_time_readable(eastern_time)

    result = ToolCallResult(
        toolCallId=tool_call_id,
        name="send_to_address",
        result="Your appointment is booked at " + formatted_time,
    )
    return result


async def handle_fetch_next_opening(tool_call_id, function_args, assistant_config):
    timezone_str = assistant_config["timezone"]
    shop_name = assistant_config["shop_name"]

    barber_names_to_ids = assistant_config["barber_names_to_ids"]
    haircut_services = assistant_config.get(
        "haircut_services", ["haircut", "Haircut", "HAIRCUT"]
    )

    services = function_args.get("services", haircut_services)
    barbers = function_args.get("barbers", list(barber_names_to_ids.keys()))
    days_ahead = function_args.get("days_ahead", 0)

    # Ignore barbers that are not in the shop
    barber_ids = [
        barber_names_to_ids.get(barber)
        for barber in barbers
        if barber_names_to_ids.get(barber) is not None
    ]
    
    print("Timezone", timezone_str)
    print("Shop name", shop_name)
    print("Services", services)
    print("Barber IDs", barber_ids)

    n_next_openings = 3

    # Use 'async with' for the booking client
    async with BarberBookingClient(shop_name=shop_name) as booking_client:
        # Get the next available time
        next_openings = await booking_client.get_next_n_openings(
            timezone_str, services, barber_ids, n_next_openings, days_ahead
        )
        
        print("Next openings", next_openings)

    if next_openings:
        next_opening_times = [opening["time"] for opening in next_openings]

        # Format like so: "Our next available slots are <time1>, <time2>, and <time3>"
        if len(next_openings) > 1:
            next_openings_str = ", ".join(next_opening_times[:-1])
            next_openings_str += f", and {next_opening_times[-1]}"
        else:
            next_openings_str = next_opening_times[0]

        message = f"Our next available slots are {next_openings_str}"

        response_coercing_string = "YOUR RESPONSE MUST BE THE FOLLOWING: " + message
    else:
        response_coercing_string = (
            "YOUR RESPONSE MUST BE THE FOLLOWING: Sorry, we don't have any available "
            "slots right now. Should I check for slots tomorrow?"
        ) if days_ahead == 0 else (
            "YOUR RESPONSE MUST BE THE FOLLOWING: Sorry, we don't have any available "
            "slots on that day either. Should I check for slots on another day?"
        )

    result = ToolCallResult(
        toolCallId=tool_call_id,
        name="fetch_next_opening",
        result=response_coercing_string,
    )
    return result



async def handle_fetch_availability_on_day(tool_call_id, function_args, assistant_config):
    timezone_str = assistant_config["timezone"]
    shop_name = assistant_config["shop_name"]

    barber_names_to_ids = assistant_config["barber_names_to_ids"]
    haircut_services = assistant_config.get(
        "haircut_services", ["haircut", "Haircut", "HAIRCUT"]
    )

    services = function_args.get("services", haircut_services)
    barbers = function_args.get("barbers", list(barber_names_to_ids.keys()))
    days_ahead = function_args.get("days_ahead", 1)

    # Ignore barbers that are not in the shop
    barber_ids = [
        barber_names_to_ids.get(barber)
        for barber in barbers
        if barber_names_to_ids.get(barber) is not None
    ]

    print("Timezone", timezone_str)
    print("Shop name", shop_name)
    print("Services", services)
    print("Barber IDs", barber_ids)
    print("Days ahead", days_ahead)

    n_next_openings = 3

    # Use async with for the booking client
    async with BarberBookingClient(shop_name=shop_name) as booking_client:
        # Get the next available time
        next_openings = await booking_client.get_next_n_openings(
            timezone_str, services, barber_ids, n_next_openings, days_ahead
        )

    print("Next openings", next_openings)

    if next_openings:
        next_opening_times = [opening["time"] for opening in next_openings]

        # Format the available slots
        if len(next_openings) > 1:
            next_openings_str = ", ".join(next_opening_times[:-1])
            next_openings_str += f", and {next_opening_times[-1]}"
        else:
            next_openings_str = next_opening_times[0]

        message = f"Our next available slots are {next_openings_str}"

        response_coercing_string = "YOUR RESPONSE MUST BE THE FOLLOWING: " + message
    else:
        response_coercing_string = (
            "YOUR RESPONSE MUST BE THE FOLLOWING: Sorry, we don't have any available "
            "slots right now. Should I check for slots on another day?"
        )

    result = ToolCallResult(
        toolCallId=tool_call_id,
        name="fetch_availability_on_day",
        result=response_coercing_string,
    )
    return result



async def handle_check_availability_on_day_and_time(
    tool_call_id, function_args, assistant_config
):
    haircut_services = assistant_config.get(
        "haircut_services", ["haircut", "Haircut", "HAIRCUT"]
    )
    shop_name = assistant_config["shop_name"]
    barber_names_to_ids = assistant_config["barber_names_to_ids"]

    services_list = function_args.get("services", haircut_services)
    barber_name = function_args.get("barber")
    day_str = function_args.get("day")
    time_str = function_args.get("time")

    if barber_name:
        barber_id = barber_names_to_ids.get(barber_name)
    else:
        barber_id = None

    async with BarberBookingClient(shop_name=shop_name) as booking_client:
        availability = await booking_client.get_barber_for_appointment(
            day_str, time_str, services_list, barber_id
        )

    if availability:
        barber_name, service_name = availability
        response_coercing_string = (
            f"YOUR RESPONSE MUST BE THE FOLLOWING: {barber_name} is available for a "
            f"{service_name} at {time_str} on {day_str}."
        )
    else:
        if barber_name:
            response_coercing_string = (
                f"YOUR RESPONSE MUST BE THE FOLLOWING: {barber_name} is NOT available "
                f"for a {services_list[0]} at {time_str} on {day_str}."
            )
        else:
            response_coercing_string = (
                f"YOUR RESPONSE MUST BE THE FOLLOWING: No barber is available for a "
                f"{services_list[0]} at {time_str} on {day_str}."
            )

    result = ToolCallResult(
        toolCallId=tool_call_id,
        name="check_availability_on_day_and_time",
        result=response_coercing_string,
    )
    return result



async def handle_check_for_walkin_availability(
    tool_call_id, function_args, assistant_config
):
    shop_name = assistant_config["shop_name"]

    async with BarberBookingClient(shop_name=shop_name) as booking_client:
        walkins_allowed = await booking_client.are_walkins_allowed()

        if walkins_allowed:
            response_coercing_string = (
                "YOUR RESPONSE MUST BE THE FOLLOWING: We are currently taking walk-ins "
                "since our barbers aren't that busy right now. However, we recommend "
                "booking an appointment to ensure you get a slot!"
            )
        else:
            response_coercing_string = (
                "YOUR RESPONSE MUST BE THE FOLLOWING: We are currently not taking walk-ins "
                "right now. Would you like to book an appointment?"
            )

        result = ToolCallResult(
            toolCallId=tool_call_id,
            name="check_for_walkin_availability",
            result=response_coercing_string,
        )
        return result



async def handle_book_squire_appointment(
    tool_call_id, function_args, assistant_config, customer_phone_number
):
    # Get the appointment details
    shop_name = function_args.get("shopName", assistant_config["shop_name"])
    barber_order_index = function_args["barberOrderIndex"]
    service_name = function_args["serviceName"]
    day = function_args["day"]
    time = standardize_time(function_args["time"])
    first_name = function_args["firstName"]
    last_name = function_args["lastName"]
    can_text_number = function_args["canTextNumber"]
    
    if can_text_number:
        phone_number = customer_phone_number
    else:
        phone_number = "+18578691479"
    
    email = "admin@syntag.ai"

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

    booking_result = await book_appointment(shop_name, appointmentBookingRequest)

    # Assuming booking_result is an object with a 'success' attribute
    if booking_result.success:
        response_message = (
            "YOUR RESPONSE MUST BE THE FOLLOWING: Your appointment has been "
            "successfully booked."
        )
    else:
        response_message = (
            "YOUR RESPONSE MUST BE THE FOLLOWING: There was an error booking your "
            "appointment. Please try again."
        )

    result = ToolCallResult(
        toolCallId=tool_call_id,
        name="book_squire_appointment",
        result=response_message,
    )
    return result
