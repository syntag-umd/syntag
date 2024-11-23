import base64
import json
import logging
from fastapi import APIRouter, Body, Depends, HTTPException, Query, Request, Response, WebSocket
from twilio.twiml.voice_response import VoiceResponse, Connect, Stream

from app.core.config import get_base_url

router = APIRouter(prefix="/sapi")


# Accept webhook to start call from twilio
@router.post("/twilio/inbound-call")
async def handle_inbound_call_twilio(request: Request):
    form_data = await request.form()
    form_dict = dict(form_data)
    logging.info(form_dict)
    caller = form_dict.get("Caller")
    called = form_dict.get("Called")
    base_url = get_base_url(request)
    response = VoiceResponse()
    response.say(f"Hello, {caller}. You called {called}.")
    print(response)
    return Response(content=str(response), media_type="application/xml")

    response = VoiceResponse()
    connect = Connect()
    connect.stream(url=f"{base_url}/sapi/ws")
    response.append(connect)
    return response


# Have a webhook that transcribes audio, chat response, and TTS
@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    connected_event = await websocket.receive_json()
    logging.info(connected_event)
    start_event = await websocket.receive_json()
    logging.info(start_event)
    stream_sid = start_event.get("start").get("streamSid")

    while True:
        data = await websocket.receive_json()
        event_type = data.get("event")
        logging.info(f"Received event: {event_type}")
        if event_type == "media":
            pass
            continue
            media_message = {
                "event": "media",
                "streamSid": stream_sid,
                "media": {"payload": base64.b64encode("raw_mulaw").decode("ascii")},
            }
        elif event_type == "stop":
            pass

        await websocket.send_text(f"Message text was: {data}")


# Not exactly sure what is sent here
# @router.post("/call-status-twilio")
