from fastapi import APIRouter, Response
from fastapi.responses import JSONResponse
from app.models.schemas import AppointmentBookingRequest

from app.routes.squire.barberBookingClient import BarberBookingClient

from app.core.config import settings

router = APIRouter(prefix="/squire")


@router.get("/shop/{shop_name}/prompt")
async def get_prompt(shop_name: str):
    async with BarberBookingClient(None, shop_name) as client:
        prompt_and_config = await client.get_prompt_and_assistant_config()
        return prompt["prompt"]


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
        async with httpx.AsyncClient() as client:
            url = f"https://browser.syntag.ai/squire/shop/{shop_name}/book"
            response = await client.post(url, json=run_input)
            response.raise_for_status()
            json_response = response.json()
            message = json_response.get('message', '')
            if message == "Book added to shop":
                # Return a 200 status with a success message
                return JSONResponse(content={"message": "Booking successful"}, status_code=200)
            else:
                # Return the error message from the response
                error_message = json_response.get('error', 'Unknown error')
                return JSONResponse(content={"error": error_message}, status_code=500)

    except Exception as e:
        # Handle any exceptions that occur during the process
        return JSONResponse(content={"error": str(e)}, status_code=500)
