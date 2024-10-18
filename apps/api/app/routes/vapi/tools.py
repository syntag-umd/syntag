from app.core.config import settings


def create_appointment_tool(shop_name, phone_number):

    current_env = settings.ENVIRONMENT

    return {
        "async": True,
        "type": "function",
        "server": {
            "url": (
                "https://api.syntag.ai/vapi/server-url"
                if current_env == "production"
                else "https://develop-api.syntag.ai/vapi/server-url"
            )
        },
        "function": {
            "name": "book_squire_appointment",
            "description": "This function allows booking an appointment with a specified barber and service at a given time. This function needs to be called to book an appointment. Before booking an appointment, collect the necessary fields from the user. Once you have the necessary information, remind the user that there is a cancellation policy that means you can't cancel the appointment less than an hour before the appointment time. You can also remind the user that they will receive a confirmation email and a text before the appointment.",
            "parameters": {
                "type": "object",
                "properties": {
                    "shopName": {
                        "description": f"The name of the shop where the appointment is being booked. ALWAYS PASS IN {shop_name} TO THIS PARAMETER.",
                        "type": "string",
                    },
                    "barberOrderIndex": {
                        "description": "The index of the barber with whom the appointment is being booked. You can ask the user for the name of the barber and then use the index from the prompt to book the appointment. Never ask users for the barber order index.",
                        "type": "integer",
                    },
                    "serviceName": {
                        "description": "The name of the service to be provided during the appointment. Specify the exact name of the service as it appears under the barber's available services.",
                        "type": "string",
                    },
                    "day": {
                        "description": "The day of the appointment. Specify a day of the weekday (i.e., 'Monday', 'Tuesday', etc.).",
                        "type": "string",
                    },
                    "time": {
                        "description": "The time of the appointment in 'HH:MM(am/pm)' format (i.e. 10:00am, 2:30pm). Must follow this pattern: ^(0?[1-9]|1[0-2]):[0-5][0-9](am|pm)$. Make sure to verify the time's format before calling this function.",
                        "type": "string",
                    },
                    "firstName": {
                        "description": "The first name of the client booking the appointment.",
                        "type": "string",
                    },
                    "lastName": {
                        "description": "The last name of the client booking the appointment.",
                        "type": "string",
                    },
                    "email": {
                        "description": "The email address of the client for booking confirmation and notifications. Must follow this pattern: ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$.  Optional.",
                        "type": "string",
                    },
                    "phoneNumber": {
                        "description": f"The phone number of the client to contact or send updates regarding the appointment. Please provide the phone number in the E.164 format (i.e., +14155552671). If the user is OK with you texting them, YOU MUST PASS IN THIS NUMBER INSTEAD: {phone_number}.",
                        "type": "string",
                    },
                },
                "required": [
                    "barberOrderIndex",
                    "serviceName",
                    "day",
                    "time",
                    "firstName",
                    "lastName",
                    "phoneNumber",
                ],
            },
        },
    }
