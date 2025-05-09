from app.core.config import settings


def create_fetch_next_opening_tool(service_types, barber_names):
    current_env = settings.ENVIRONMENT

    return {
        "async": False,
        "type": "function",
        "server": {
            "url": (
                "https://api.syntag.ai/vapi/server-url"
                if current_env == "production"
                else "https://develop-api.syntag.ai/vapi/server-url"
            )
        },
        "function": {
            "name": "fetch_next_opening",
            "description": "Call this function when a customer asks for the next opening, availability, slot or something similar. It is encouraged to call this function with no parameters, but you can pass in parameters if the customer voluntarily provides them (i.e. don't prompt them for parameters). Calling this function will tell you exactly what to say to the customer. Again, while this function does retrieve available times, it is meant to tell you exactly what to say in response. However, you are free to translate the response into the language the customer speaks.",
            "parameters": {
                "type": "object",
                "properties": {
                    "services": {
                        "description": f"A list of all services relating to the user's specified service. As this parameter is optional, you should only provide it if the user actually specifies their service. Otherwise, it will default to haircut-related services, which is the intended behavior. The possible values for this are: {service_types}.",
                        "type": "array",
                        "items": {"type": "string"},
                    },
                    "barbers": {
                        "description": f"A list of all barbers relating to the user's specified barber. As this parameter is optional, you should only provide it if the user actually specifies their barber. Otherwise, it will default to all barbers, which is the intended behavior. The possible values for this are: {barber_names}.",
                        "type": "array",
                        "items": {"type": "string"},
                    },
                    "days_ahead": {
                        "description": "The number of days ahead to check availability for. 1 implies checking availability for tomorrow, 2 implies checking availability for the day after tomorrow, and so on.",
                        "type": "integer",
                    }
                },
                "required": [],
            },
        },
    }
    
def create_fetch_availability_on_day_tool(service_types, barber_names):
    current_env = settings.ENVIRONMENT

    return {
        "async": False,
        "type": "function",
        "server": {
            "url": (
                "https://api.syntag.ai/vapi/server-url"
                if current_env == "production"
                else "https://develop-api.syntag.ai/vapi/server-url"
            )
        },
        "function": {
            "name": "fetch_availability_on_day",
            "description": "Call this function when a customer asks for the availability on a specific day. Calling this function will tell you exactly what to say to the customer. Again, while this function does retrieve available times, it is meant to tell you exactly what to say in response. However, you are free to translate the response into the language the customer speaks.",
            "parameters": {
                "type": "object",
                "properties": {
                    "services": {
                        "description": f"A list of all services relating to the user's specified service. As this parameter is optional, you should only provide it if the user actually specifies their service. Otherwise, it will default to haircut-related services, which is the intended behavior. The possible values for this are: {service_types}.",
                        "type": "array",
                        "items": {"type": "string"},
                    },
                    "barbers": {
                        "description": f"A list of all barbers relating to the user's specified barber. As this parameter is optional, you should only provide it if the user actually specifies their barber. Otherwise, it will default to all barbers, which is the intended behavior. The possible values for this are: {barber_names}.",
                        "type": "array",
                        "items": {"type": "string"},
                    },
                    "days_ahead": {
                        "description": "The number of days ahead to check availability for. 1 implies checking availability for tomorrow, 2 implies checking availability for the day after tomorrow, and so on.",
                        "type": "integer",
                    },  
                },
                "required": ["days_ahead"],
            },
        },
    }

def create_check_walkin_availability_tool():
    
    current_env = settings.ENVIRONMENT
    
    return {
        "async": False,
        "type": "function",
        "server": {
            "url": (
                "https://api.syntag.ai/vapi/server-url"
                if current_env == "production"
                else "https://develop-api.syntag.ai/vapi/server-url"
            )
        },
        "function": {
            "name": "check_walkin_availability",
            "description": "Call this function when a customer asks for walk-in availability. Calling this function will tell you exactly what to say to the customer. Again, while this function does retrieve available times, it is meant to tell you exactly what to say in response. However, you are free to translate the response into the language the customer speaks.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": [],
            },
        },
    }
    
def create_get_barber_for_appointment_tool(service_types, barber_names):
    
    current_env = settings.ENVIRONMENT
    
    return {
        "async": False,
        "type": "function",
        "server": {
            "url": (
                "https://api.syntag.ai/vapi/server-url"
                if current_env == "production"
                else "https://develop-api.syntag.ai/vapi/server-url"
            )
        },
        "function": {
            "name": "check_walkin_availability",
            "description": "Call this function when a customer asks for walk-in availability. Calling this function will tell you exactly what to say to the customer. Again, while this function does retrieve available times, it is meant to tell you exactly what to say in response. However, you are free to translate the response into the language the customer speaks.",
            "parameters": {
                "type": "object",
                "properties": {
                    "day": {
                        "description": "The day of the appointment. Must be in the format 'YYYY-MM-DD'.",
                        "type": "string",
                    },
                    "time": {
                        "description": "The time of the appointment in 'HH:MM' format.",
                        "type": "string",
                    },
                    "services": {
                        "description": f"A list of all services relating to the user's specified service. As this parameter is optional, you should only provide it if the user actually specifies their service. Otherwise, it will default to haircut-related services, which is the intended behavior. The default services will be those that are haircut-related. The possible values for this are: {service_types}.",
                        "type": "array",
                        "items": {"type": "string"},
                    }, 
                    "barber": {
                        "description": f"The name of the barber with whom the appointment is being booked. The possible values for this are: {barber_names}.",
                        "type": "string",
                    }
                },
                "required": ["day", "time"],
            },
        },
    }

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
            "description": "This function allows booking an appointment with a specified barber and service at a given time. This function needs to be called to book an appointment. Before booking an appointment, collect the necessary fields from the user. Don't forget to collect their first name and last name. Then, ask if the phone number they are calling from is fine to text. If not, just ask for their number - you can format it by yourself in E.164 format without asking them about a specific format.",
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
                    # "email": {
                    #     "description": "The email address of the client for booking confirmation and notifications. Must follow this pattern: ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$.  Optional.",
                    #     "type": "string",
                    # },
                    "canTextNumber": {
                        "description": f"Whether or not the user consents to receiving a text confirmation of their appointment.", 
                        "type": "boolean",
                    },
                },
                "required": [
                    "barberOrderIndex",
                    "serviceName",
                    "day",
                    "time",
                    "firstName",
                    "lastName",
                    "canTextNumber",
                ],
            },
        },
    }
