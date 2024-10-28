import asyncio
from typing import Optional, List
import aiohttp
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from collections import defaultdict
import pytz
from itertools import groupby

from app.routes.squire.defaultPrompt import build_default_prompt


class BarberBookingClient:
    def __init__(self, booking_link: Optional[str] = None, shop_name: Optional[str] = None):
        if not booking_link:
            if not shop_name:
                raise ValueError("Either booking_link or shop_name must be provided")
            booking_link = f"https://getsquire.com/booking/book/{shop_name}"

        self.booking_link = booking_link
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        }
        self.starting_api_link = self.booking_link_to_starting_api_link(booking_link)
        self.session = None
        self.shop_id = None
        self.shop_canonical_name = None
        self.shop_timezone = None
        self.barbers = (
            {}
        )  # barber_name: {'id': id, 'min_service_length': min_service_length}

    def booking_link_to_starting_api_link(self, booking_link):
        return booking_link.replace(
            "https://getsquire.com/booking/book/",
            "https://api.getsquire.com/v1/shop/",
        )

    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        # Fetch raw shop data

        async with self.session.get(
            self.starting_api_link, headers=self.headers
        ) as response:
            raw_shop_data = await response.json()
        self.shop_canonical_name = raw_shop_data.get(
            "name", " this barbershop"
        )  # Default to " this barbershop" if name is not found so the prompt is still good.

        async with self.session.get(
            self.starting_api_link + "/professional", headers=self.headers
        ) as response:
            raw_shop_data = await response.json()
        self.process_shop_data(raw_shop_data)
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.session.close()

    def process_shop_data(self, data):
        shop_timezone = None
        shop_id = None
        barber_name_to_id = {}

        for item in data:
            barber_info = item.get("barber", {})

            first_name = barber_info.get("firstName", "")
            last_name = barber_info.get("lastName", "")
            barber_order_index = barber_info.get("order", 0)
            full_name = (first_name + " " + last_name).strip()

            barber_id = barber_info.get("id", None)
            min_service_length = barber_info.get("minServiceLen", None)

            if full_name and barber_id:
                barber_name_to_id[full_name] = {
                    "id": barber_id,
                    "barber_order_index": barber_order_index,
                    "min_service_length": min_service_length,
                }

            if shop_timezone is None or shop_id is None:
                shop_info = barber_info.get("shop", {})
                if shop_info:
                    shop_timezone = shop_timezone or shop_info.get("timezone", None)
                    shop_id = shop_id or shop_info.get("id", None)

        self.shop_id = shop_id
        self.shop_timezone = shop_timezone
        self.barbers = barber_name_to_id

    async def fetch_services(self, barber_id, barber_name):
        services_link = f"https://api.getsquire.com/v2/shop/{self.shop_id}/barber/{barber_id}/service"
        async with self.session.get(services_link, headers=self.headers) as response:
            response = await response.json()
            return barber_name, response

    async def fetch_availability(self, barber_id, start_time, end_time, time_division):
        timing_link = (
            f"https://api.getsquire.com/v1/barber/{barber_id}/schedule-time-range/"
            f"{start_time}/{end_time}/{time_division}"
        )
        async with self.session.get(timing_link, headers=self.headers) as response:
            return await response.json()

    def process_services(self, services_json):
        result = []
        for service in services_json:
            service_name = service.get("name", "")
            service_id = service.get("id", "")
            duration = service.get("duration", 0)
            cost_cents = service.get("cost", 0)
            description = service.get("desc", "")

            cost_dollars = cost_cents / 100.0
            cost_formatted = "${:,.2f}".format(cost_dollars)

            service_obj = {
                "service_name": service_name,
                "id": service_id,
                "duration": duration,
                "cost": cost_formatted,
                "description": description,
            }
            result.append(service_obj)
        return result

    def create_availability_prompt(
        self, data, starting_time_division=15, barber_min_service_length=15
    ):
        prompt = ""
        time_format = "%Y-%m-%dT%H:%M:%S.%fZ"
        timezone_str = self.shop_timezone or "UTC"
        target_tz = ZoneInfo(timezone_str)

        time_division = (
            30 if barber_min_service_length == 30 else starting_time_division
        )

        for day_info in data:
            if day_info["availability"] > 0:
                times = day_info["times"]
                available_times = []

                for period in ["morning", "afternoon", "evening"]:
                    for time_slot in times.get(period, []):
                        if time_slot["available"]:
                            time_str = time_slot["time"]
                            time_obj = datetime.strptime(time_str, time_format)
                            time_obj = time_obj.replace(
                                tzinfo=ZoneInfo("UTC")
                            ).astimezone(target_tz)
                            available_times.append(time_obj)

                available_times.sort()
                blocks = []

                if available_times:
                    start_time = available_times[0]
                    end_time = start_time

                    for current_time in available_times[1:]:
                        if current_time == end_time + timedelta(minutes=time_division):
                            end_time = current_time
                        else:
                            blocks.append((start_time, end_time))
                            start_time = current_time
                            end_time = current_time

                    blocks.append((start_time, end_time))

                    block_strings = []
                    for start, end in blocks:
                        start_str = start.strftime("%I:%M %p")
                        end_str = end.strftime("%I:%M %p")
                        if start == end:
                            block_strings.append(f"{start_str}")
                        else:
                            block_strings.append(f"{start_str} to {end_str}")

                    day_str = start_time.strftime("%A %B %d")
                    prompt += f"{day_str}: "
                    prompt += ", ".join(block_strings)
                    prompt += "\n"

        return prompt

    async def get_prompt_and_assistant_config(self):
        prompt = ""

        start_time = datetime.now().strftime("%Y-%m-%d")
        end_time = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
        
        barber_names_to_ids = {}

        fetch_services_tasks = []
        for barber_name, barber_info in self.barbers.items():
            barber_id = barber_info["id"]
            
            barber_names_to_ids[barber_name] = barber_id
            
            barber_min_service_length = barber_info["min_service_length"]
            task = self.fetch_services(barber_id, barber_name)
            fetch_services_tasks.append(
                (barber_name, barber_id, barber_min_service_length, task)
            )

        services_responses = await asyncio.gather(
            *(task for _, _, _, task in fetch_services_tasks)
        )

        # Build the initial part of the prompt

        barber_list_string = ", ".join(self.barbers.keys())

        unique_services = []

        for barber_name, services in services_responses:
            for service in services:
                unique_services.append(service["name"])

            services_offered_with_durations_and_cost_string = ", ".join(
                [
                    f"{service['name']} ({service['duration']} minutes, {service['cost']//100} dollars)"
                    for service in services
                ]
            )

            # store the string on self.barbers
            self.barbers[barber_name][
                "services"
            ] = services_offered_with_durations_and_cost_string

        unique_services = list(set(unique_services))

        service_list_string = ", ".join(unique_services)
        timezone = self.shop_timezone or "UTC"

        starter_prompt = build_default_prompt(
            self.shop_canonical_name, barber_list_string, service_list_string, timezone
        )

        prompt += starter_prompt + "\n\n"

        availability_tasks = []

        for (barber_name, barber_id, barber_min_service_length, _), (
            _,
            raw_services,
        ) in zip(fetch_services_tasks, services_responses):
            processed_services = self.process_services(raw_services)
            unique_durations = sorted(
                {service["duration"] for service in processed_services}
            )

            for duration in unique_durations:
                task = self.fetch_availability(
                    barber_id, start_time, end_time, duration
                )
                availability_tasks.append(
                    (barber_name, barber_min_service_length, duration, task)
                )

        availability_responses = await asyncio.gather(
            *(task for _, _, _, task in availability_tasks)
        )

        barber_availability = defaultdict(list)
        for (
            barber_name,
            barber_min_service_length,
            duration,
            _,
        ), raw_availability in zip(availability_tasks, availability_responses):
            barber_availability[barber_name].append(
                (duration, barber_min_service_length, raw_availability)
            )

        for barber_name in self.barbers:

            barber_order_index = self.barbers[barber_name]["barber_order_index"]

            prompt += (
                f"Barber: {barber_name} (barberOrderIndex: {barber_order_index}) \n\n"
            )

            prompt += "Offered services: \n"

            prompt += self.barbers[barber_name]["services"]

            prompt += "\n\n"

            durations_availabilities = sorted(
                barber_availability[barber_name], key=lambda x: x[0]
            )
            for (
                duration,
                barber_min_service_length,
                raw_json_availability,
            ) in durations_availabilities:
                prompt += f"Duration: {duration} minutes\n\n"
                prompt += self.create_availability_prompt(
                    raw_json_availability, duration, barber_min_service_length
                )
                prompt += "\n"

        return {
            "prompt": prompt,
            "barber_names_to_ids": barber_names_to_ids,
            "services": unique_services,
            "timezone": timezone,
        }
    
    def extract_available_times(self, availability_data, target_tz_str):
        # Returns a list of datetime objects representing available times in target timezone
        available_times = []
        time_format = "%Y-%m-%dT%H:%M:%S.%fZ"
        target_tz = ZoneInfo(target_tz_str)
        for day_info in availability_data:
            if day_info["availability"] > 0:
                times = day_info["times"]
                for period in ["morning", "afternoon", "evening"]:
                    for time_slot in times.get(period, []):
                        if time_slot["available"]:
                            time_str = time_slot["time"]
                            time_obj = datetime.strptime(time_str, time_format)
                            # The time from API is in UTC
                            time_obj = time_obj.replace(tzinfo=ZoneInfo("UTC")).astimezone(target_tz)
                            available_times.append(time_obj)
        return available_times


    async def get_next_n_openings(self, timezone_str: str, services_list: List[str], barber_ids: List[str], n: int, n_days_ahead: int = 0):
        openings = []
        now_utc = datetime.utcnow().replace(tzinfo=ZoneInfo("UTC"))
        now_target_tz = now_utc.astimezone(ZoneInfo(timezone_str))
        start_date = now_target_tz.date() + timedelta(days=n_days_ahead)
        start_time = start_date.strftime("%Y-%m-%d")
        end_time = start_time

        for barber_id in barber_ids:
            # Get barber_name
            barber_name = None
            for name, info in self.barbers.items():
                if info['id'] == barber_id:
                    barber_name = name
                    break
                
            print(self.barbers)
            print(barber_id)
            print(barber_name)
            if not barber_name:
                continue  # Barber not found

            # Fetch services
            barber_services = await self.fetch_services(barber_id, barber_name)
            services_json = barber_services[1]
            processed_services = self.process_services(services_json)
            
            print(processed_services)

            # Filter services
            matching_services = [s for s in processed_services if s['service_name'].strip() in [s.strip() for s in services_list]]
            
            print(matching_services)

            if not matching_services:
                continue  # Barber does not offer the desired services

            for service in matching_services:
                service_id = service['id']
                service_name = service['service_name']
                duration = service['duration']

                # Fetch availability
                availability_data = await self.fetch_availability(barber_id, start_time, end_time, duration)

                # Extract available times
                available_times = self.extract_available_times(availability_data, timezone_str)

                for available_time in available_times:
                    weekday_name = available_time.strftime('%A')
                    time_str = available_time.strftime('%I:%M %p')
                    openings.append({
                        'barber_id': barber_id,
                        'barber_name': barber_name,
                        'service_id': service_id,
                        'service_name': service_name,
                        'weekday': weekday_name,
                        'time': time_str,
                        'datetime': available_time,  # For accurate sorting
                    })

        # Sort openings by datetime
        openings.sort(key=lambda x: x['datetime'])

        # Collect up to n unique times with one opening per time
        unique_openings = []
        seen_datetimes = set()

        for opening in openings:
            dt = opening['datetime']
            if dt not in seen_datetimes:
                seen_datetimes.add(dt)
                # Remove 'datetime' field as it's no longer needed
                del opening['datetime']
                unique_openings.append(opening)
                if len(unique_openings) == n:
                    break

        return unique_openings

    async def are_walkins_allowed(self) -> bool:
        # Get current time in shop timezone
        timezone_str = self.shop_timezone or 'UTC'
        now_utc = datetime.utcnow().replace(tzinfo=ZoneInfo('UTC'))
        now_shop_tz = now_utc.astimezone(ZoneInfo(timezone_str))
        now_plus_150 = now_shop_tz + timedelta(minutes=150)
        start_time = now_shop_tz.strftime('%Y-%m-%d')
        end_time = start_time  # Only today

        # Initialize set to collect unique available times
        unique_times = set()

        # Collect fetch_availability tasks for each barber using their minimum service length
        fetch_availability_tasks = []
        for barber_name, barber_info in self.barbers.items():
            barber_id = barber_info['id']
            min_service_length = barber_info['min_service_length'] or 15  # Default to 15 if None
            duration = min_service_length
            task = self.fetch_availability(barber_id, start_time, end_time, duration)
            fetch_availability_tasks.append((barber_id, task))

        # Await all fetch_availability tasks concurrently
        availability_results = await asyncio.gather(*(task for _, task in fetch_availability_tasks))

        # Process availability data
        for (barber_id, _), availability_data in zip(fetch_availability_tasks, availability_results):
            times = self.extract_available_times(availability_data, timezone_str)
            for time in times:
                if now_shop_tz <= time <= now_plus_150:
                    unique_times.add(time)

        # Count the number of unique times
        num_unique_times = len(unique_times)

        # Return True if there are more than 4 unique times, else False
        return num_unique_times > 4

    async def get_barber_for_appointment(self, day_str, time_str, services_list, barber_id=None):
        """
        Check if an appointment at the given day and time is available for the given services.
        If available, return the name of the barber and the service name with which the appointment is available.
        If barber_id is provided, check availability only for that barber.
        """
        shop_timezone = self.shop_timezone or 'UTC'

        # Parse the day and time into datetime object in shop's timezone
        appointment_datetime = datetime.strptime(f'{day_str} {time_str}', '%Y-%m-%d %H:%M')
        appointment_datetime = appointment_datetime.replace(tzinfo=ZoneInfo(shop_timezone))

        if barber_id:
            # Get barber_name
            barber_name = next((name for name, info in self.barbers.items() if info['id'] == barber_id), None)
            if not barber_name:
                return None  # Barber not found
            barbers_to_check = [(barber_name, barber_id)]
        else:
            barbers_to_check = [(name, info['id']) for name, info in self.barbers.items()]

        for barber_name, barber_id in barbers_to_check:

            barber_info = self.barbers[barber_name]
            min_service_length = barber_info.get('min_service_length') or 15

            # Fetch services offered by the barber
            barber_services = await self.fetch_services(barber_id, barber_name)
            services_json = barber_services[1]
            processed_services = self.process_services(services_json)

            # Filter services to those matching the services_list
            matching_services = [
                service for service in processed_services
                if service['service_name'].strip().lower() in [s.strip().lower() for s in services_list]
            ]
            if not matching_services:
                continue  # This barber does not offer the requested services

            # For each matching service, check availability
            for service in matching_services:
                service_id = service['id']
                service_name = service['service_name']
                duration = service['duration']

                # Fetch availability for that service duration
                availability_data = await self.fetch_availability(barber_id, day_str, day_str, duration)

                # Extract available times
                available_times = self.extract_available_times(availability_data, shop_timezone)

                # Check if appointment_datetime is in available_times
                if appointment_datetime in available_times:
                    # Appointment is available with this barber and service
                    return barber_name, service_name

        # No appointment available at that time
        return None