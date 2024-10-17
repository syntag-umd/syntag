from fastapi import FastAPI, Form, Request, Response, APIRouter, Depends
from twilio.twiml.voice_response import VoiceResponse, Dial
from twilio.rest import Client
from app.database.session import get_db
from sqlalchemy.orm import Session
from app.database.tables.manual_call_transcription import ManualCallTranscription
from app.core.config import settings
from twilio.request_validator import RequestValidator
import openai
import os
import json


environment = settings.ENVIRONMENT

project_root = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))

if environment == 'production':
    api_domain = 'https://api.syntag.ai'
elif environment == 'development':
    api_domain = 'https://develop-api.syntag.ai'
elif environment == 'local':
    api_domain = 'https://syntag.loca.lt'
else:
    api_domain = 'http://localhost:8000'

# Twilio client setup
account_sid = settings.TWILIO_ACCOUNT_SID
auth_token = settings.TWILIO_AUTH_TOKEN
client = Client(account_sid, auth_token)
validator = RequestValidator(auth_token)

# OpenAI API key
openai.api_key = settings.OPENAI_API_KEY

router = APIRouter(prefix="/record-call")

async def validate_twilio_request(request: Request):
    signature = request.headers.get('X-Twilio-Signature', '')
    url = str(request.url)

    if request.method == 'POST':
        post_args = await request.form()
        params = dict(post_args)
    else:
        params = dict(request.query_params)

    if not validator.validate(url, params, signature):
        # raise HTTPException(status_code=403, detail="Invalid request")
        pass

@router.api_route("/voice", methods=["GET", "POST"])
async def voice(request: Request):
    await validate_twilio_request(request)
    response = VoiceResponse()
    
    response.say('Please note, this call will be recorded and transcribed.')

    dial = Dial(
        record='record-from-answer',
        recording_status_callback=api_domain + '/record-call/recording-completed',
        recording_status_callback_method='POST',
        recording_transcribe=True,
        recording_transcribe_callback=api_domain + '/record-call/transcription-completed',
        recording_transcribe_callback_method='POST'
    )
    dial.number('+18578691479')
    response.append(dial)

    return Response(content=str(response), media_type='application/xml')

@router.post("/transcription-completed")
async def transcription_completed(
    request: Request,
    RecordingSid: str = Form(...),
    TranscriptionText: str = Form(...),
    CallSid: str = Form(...),
    db: Session = Depends(get_db)
):
    await validate_twilio_request(request)

    # Get the call object
    call = client.calls(CallSid).fetch()

    # Get the call details
    from_number = call.from_formatted
    to_number = call.to_formatted

    # Process the transcription with OpenAI API
    messages = await process_transcript_with_openai(TranscriptionText)

    # Store transcription in the database
    transcription = ManualCallTranscription(
        call_sid=CallSid,
        recording_sid=RecordingSid,
        caller_phone_number=from_number,
        called_phone_number=to_number,
        messages={'messages': messages}
    )
    db.add(transcription)
    db.commit()
    db.close()

    return Response(content='Transcription processed and saved.', media_type='text/plain')

async def process_transcript_with_openai(transcription_text):
    system_prompt = (
        "You are to process a transcription of a phone call. "
        "Divide the transcription into a list of messages with roles and content. "
        "The roles are either 'receptionist' or 'customer'. "
        "Ensure the messages are in chronological order and properly attributed."
        "Here's an example of a transcript, and how the resulting messages should be formatted:\n"
        "Transcript: Hello, this is the receptionist. How may I help you? I'd like to make an appointment. "
        "Sure, what time would you like to come in? 3 PM works for me. "
        "Great, we'll see you then. Thank you. You're welcome.\n"
        "Messages: [{'role': 'receptionist', 'content': 'Hello, this is the receptionist. How may I help you?'}, "
        "{'role': 'customer', 'content': 'I'd like to make an appointment.'}, "
        "{'role': 'receptionist', 'content': 'Sure, what time would you like to come in?'}, "
        "{'role': 'customer', 'content': '3 PM works for me.'}, "
        "{'role': 'receptionist', 'content': 'Great, we will see you then.'}, "
        "{'role': 'customer', 'content': 'Thank you.'}, "
        "{'role': 'receptionist', 'content': 'You're welcome.'}]"
        "It's critical that you only include the array in your response. Do not include any other text."
    )

    response = openai.ChatCompletion.create(
        model='gpt-3.5-turbo',
        messages=[
            {'role': 'system', 'content': system_prompt},
            {'role': 'user', 'content': "Transcript: " + transcription_text + "\nMessages: "}
        ],
        max_tokens=1500,
        temperature=0.2
    )

    assistant_reply = response['choices'][0]['message']['content']

    # Parse the assistant's reply into a Python list
    import json
    try:
        messages = json.loads(assistant_reply)
    except json.JSONDecodeError:
        # Handle parsing error
        messages = []  # Or implement a fallback

    return messages

@router.post("/recording-completed")
async def recording_completed(
    request: Request,
    RecordingSid: str = Form(...),
    RecordingUrl: str = Form(...),
    CallSid: str = Form(...),
):
    await validate_twilio_request(request)
    # Optional: Handle recording completion event
    return Response(content='Recording completed.', media_type='text/plain')
