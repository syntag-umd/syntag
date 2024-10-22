from fastapi import APIRouter, Response
from fastapi.responses import JSONResponse
from apify_client import ApifyClient
from app.models.schemas import AppointmentBookingRequest

from app.routes.squire.barberBookingClient import BarberBookingClient

from app.core.config import settings

router = APIRouter(prefix="/squire")


@router.get("/shop/{shop_name}/prompt")
async def get_prompt(shop_name: str):
    async with BarberBookingClient(None, shop_name) as client:
        prompt = await client.get_prompt()
        return prompt


@router.post("/shop/{shop_name}/book")
async def book_appointment(shop_name: str, request: AppointmentBookingRequest):
    """
    Book an appointment at the specified shop.

    Args:
        shop_name (str): The name of the shop.
        request (AppointmentBookingRequest): The booking details.

    Returns:
        Response: An image if successful, or an error message.
    """
    booking_link = f"https://getsquire.com/booking/book/{shop_name}"

    # Initialize the ApifyClient with your API token
    client = ApifyClient(settings.APIFY_TOKEN)

    # Prepare the Actor input
    run_input = {
        "url": booking_link,
        "barberOrderIndex": request.barberOrderIndex,
        "serviceName": request.serviceName,
        "day": request.day,
        "time": request.time,
        "firstName": request.firstName,
        "lastName": request.lastName,
        "email": request.email,
        "phoneNumber": request.phoneNumber,
    }

    try:
        # Run the Actor and wait for it to finish
        run = client.actor(settings.APIFY_SQUIRE_BOOKING_SCRAPER_ACTOR_ID).call(
            run_input=run_input
        )

        kv_store = client.key_value_store(run["defaultKeyValueStoreId"])

        # Get the result status
        result_record = kv_store.get_record("RESULT")
        result = result_record["value"]

        # Get the output content
        output_record = kv_store.get_record("OUTPUT")
        output_content = output_record["value"]

        if result == "SUCCESS":
            # The output is an image/png; return it
            return Response(content=output_content, media_type="image/png")
        else:
            # The output is a stack trace; return it as an error message
            return JSONResponse(content={"error": output_content}, status_code=500)

    except Exception as e:
        # Handle any exceptions that occur during the process
        return JSONResponse(content={"error": str(e)}, status_code=500)
