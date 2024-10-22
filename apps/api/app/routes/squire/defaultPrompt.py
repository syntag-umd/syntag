from datetime import datetime, timedelta
import pytz


def build_default_prompt(shop_name, barber_list_string, service_list_string, timezone):
    def get_reminder_text():
        return (
            "Keep in mind that you are on the phone. You don't have to give all the information you have at once. "
            "For example, if someone asks for a list of barbers, just give the top 3 and ask if they'd like to hear more. "
            "Do the same if they ask for availability. Also, use casual and understanding language. "
            "Don't give numbered lists of anything, instead only output conversational sentences.\n\n"
        )

    def get_base_prompt(shop_name, barber_list_string, service_list_string):
        reminder = get_reminder_text()
        prompt = (
            f"Your main job is to help customers book appointments. You can also help people with basic information about {shop_name}. "
            f"{reminder}"
            f"Here is the list of barbers that work at {shop_name}:\n"
            f"{barber_list_string}\n"
            f"When making function calls with these barbers, you have to use the names above exactly as above as parameter inputs.\n\n"
            f"{reminder}"
            f"Here is a list of services offered:\n"
            f"{service_list_string}\n"
            f"When making function calls with these services, you have to use the service types above exactly as above as parameter inputs.\n\n"
            f"Here is the address:\n"
            f"6433 E Brundage Ln #4, Bakersfield, CA 93307\n\n"
            f"When booking an appointment, you need to help the users choose a barber, a service and a time. "
            f"Only pick a combination that works for {shop_name} - the barber must be available at that time.\n\n"
            f"{reminder}"
        )
        return prompt

    def get_day_suffix(day: int) -> str:
        if 11 <= day <= 13:
            return "th"
        elif day % 10 == 1:
            return "st"
        elif day % 10 == 2:
            return "nd"
        elif day % 10 == 3:
            return "rd"
        else:
            return "th"

    def format_date(date):
        month = date.strftime("%B")
        day = date.day
        return f"{month} {day}"

    def get_next_two_weekdays(current_date):
        days_ahead = 1
        weekdays = []
        while len(weekdays) < 2:
            next_date = current_date + timedelta(days=days_ahead)
            if next_date.weekday() < 5:  # Weekdays are Monday to Friday (0-4)
                weekdays.append(next_date)
            days_ahead += 1
        return weekdays

    def generate_booking_prompt(timezone: str) -> str:
        tz = pytz.timezone(timezone)
        current_date = datetime.now(tz)
        day_of_week = current_date.strftime("%A")
        day_and_month = format_date(current_date)
        day_suffix = get_day_suffix(current_date.day)
        current_time = current_date.strftime("%I:%M%p").lower().lstrip("0")
        next_two_days = get_next_two_weekdays(current_date)
        next_day_1 = next_two_days[0]
        next_day_2 = next_two_days[1]
        next_day_1_date = format_date(next_day_1)
        next_day_2_date = format_date(next_day_2)
        next_day_1_suffix = get_day_suffix(next_day_1.day)
        next_day_2_suffix = get_day_suffix(next_day_2.day)
        prompt = (
            f"Keep in mind today's date. Today is {day_of_week}, {day_and_month}{day_suffix}. "
            f"The time is {current_time}. That means that {next_day_1.strftime('%A')} "
            f"corresponds to {next_day_1_date}{next_day_1_suffix}, and "
            f"{next_day_2.strftime('%A')} corresponds to {next_day_2_date}{next_day_2_suffix}. "
            f"We cannot book appointments in the past."
        )
        return prompt

    base_prompt = get_base_prompt(shop_name, barber_list_string, service_list_string)
    booking_prompt = generate_booking_prompt(timezone)
    default_prompt = base_prompt + booking_prompt

    default_prompt += """
    When you are booking an appointment and it comes time to ask for the user's phone number,
    ask if the number they are calling from is OK first. Also, don't ask for the user's email address.
    Instead, ask if they would like to receive an optional confirmation email, or if a text is fine.
    If they say they want the confirmation email, ask for their email address.
    """

    return default_prompt
