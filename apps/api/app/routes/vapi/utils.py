import re
from datetime import datetime


def standardize_time(time_str):
    # Remove any extra spaces
    time_str = time_str.strip()

    # Use a regex pattern to find AM/PM regardless of case and handle various formats
    pattern = r"(\d{1,2}):(\d{2})\s*([AaPp][Mm])"
    match = re.match(pattern, time_str)

    if match:
        # Extract hour, minute, and meridiem
        hour = int(match.group(1))
        minute = match.group(2)
        meridiem = match.group(3).lower()  # Convert AM/PM to lowercase

        # Convert hour to 12-hour format without leading zeros
        if hour == 12:
            if meridiem == "am":
                hour = 0  # Midnight case
        elif meridiem == "pm" and hour != 12:
            hour += 12  # Convert PM times to 24-hour clock

        # Reformat into 12-hour format
        time_obj = datetime.strptime(f"{hour}:{minute}", "%H:%M")
        standardized_time = (
            time_obj.strftime("%I:%M%p").lower().lstrip("0")
        )  # Remove leading zero from hour

        return standardized_time
    else:
        raise ValueError(f"Invalid time format: {time_str}")

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