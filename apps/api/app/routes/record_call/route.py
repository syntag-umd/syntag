from google.oauth2 import service_account
from google.cloud import storage

from io import BytesIO

from app.core.config import settings
from twilio.request_validator import RequestValidator
from fastapi import FastAPI, Form, Request, Response, HTTPException, APIRouter, Depends
from twilio.twiml.voice_response import VoiceResponse, Dial
from twilio.rest import Client
from app.database.session import get_db
from sqlalchemy.orm import Session

from app.database.tables.manual_call_transcription import ManualCallTranscription

import os
import requests
from requests.auth import HTTPBasicAuth
from google.cloud import speech_v1p1beta1 as speech

import openai
from openai import OpenAI

import pusher

pusher_client = pusher.Pusher(
    app_id=settings.PUSHER_APP_ID,
    key=settings.PUSHER_KEY,
    secret=settings.PUSHER_SECRET,
    cluster=settings.PUSHER_CLUSTER,
    ssl=True
)

openai_client = OpenAI()

openai.api_key = settings.OPENAI_API_KEY

environment = settings.ENVIRONMENT

project_root = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))


if environment == 'production':
    api_domain = 'https://api.syntag.ai'
elif environment == 'development':
    api_domain = 'https://develop-api.syntag.ai'
else:
    api_domain = 'http://localhost:8000'

account_sid = settings.TWILIO_ACCOUNT_SID
auth_token = settings.TWILIO_AUTH_TOKEN

client = Client(account_sid, auth_token)
validator = RequestValidator(auth_token)

recipient_number = '+18578691479'  # Vikram's Number

router = APIRouter(prefix="/record-call")

async def validate_twilio_request(request: Request):
    """Validate that the request came from Twilio."""
    signature = request.headers.get('X-Twilio-Signature', '')
    url = str(request.url)
    
    if request.method == 'POST':
        post_args = await request.form()
        params = dict(post_args)
    else:
        params = dict(request.query_params)
    
    
    if not validator.validate(url, params, signature):
        # raise HTTPException(stpassatus_code=403, detail="Invalid request")
        pass



@router.api_route("/voice", methods=["GET", "POST"])
async def voice(request: Request):
    await validate_twilio_request(request)
    
    if request.method == 'POST':
        post_args = await request.form()
        params = dict(post_args)
    else:
        params = dict(request.query_params)
    
    from_number = params.get('From')
    to_number = params.get('To')

    # Send event to Pusher
    pusher_client.trigger('call-channel', 'incoming-call', {
        'from_number': from_number,
        'to_number': to_number
    })
    
    response = VoiceResponse()

    response.say('Please note, this call will be recorded.')

    dial = Dial(
        record='record-from-answer',
        recording_status_callback=api_domain + '/record-call/recording-completed',
        recording_status_callback_method='POST', 
        action='/record-call/dial-status', 
        method='POST',
        answerOnBridge=True,
        timeout=20  # Set timeout to 20 seconds
# This line ensures the call is only "answered" when the recipient picks up
    )


    dial.number(recipient_number) 
    response.append(dial)

    return Response(content=str(response), media_type='application/xml')

@router.api_route("/dial-status", methods=["GET", "POST"])
async def dial_status(request: Request):
    """Handle the status after the Dial verb completes."""
    await validate_twilio_request(request)
    
    if request.method == 'POST':
        post_args = await request.form()
        params = dict(post_args)
    else:
        params = dict(request.query_params)
    
    dial_call_status = params.get('DialCallStatus')
    
    response = VoiceResponse()
    if dial_call_status in ['no-answer', 'busy', 'failed', 'canceled']:
        # The call was not answered, proceed to voicemail
        response.redirect('/record-call/voicemail', method='POST')
    else:
        # Call was answered and completed, end the call
        response.hangup()

    return Response(content=str(response), media_type='application/xml')

@router.api_route("/voicemail", methods=["POST"])
async def voicemail(request: Request):
    """Voicemail endpoint triggered when the call is not answered."""
    await validate_twilio_request(request)
    response = VoiceResponse()

    # Ask the caller to leave a voicemail
    response.say("Sorry, we're currently assisting other customers right now. We'll call you back as soon as possible. Please leave your full name and your desired service and appointment time after the beep.")

    # Record the voicemail
    response.record(
        max_length=60,  # Limit the voicemail duration to 60 seconds
        play_beep=True,
        transcribe=True,  # Optional: Enable transcription for the voicemail
        transcribe_callback='/record-call/voicemail-transcribed'  # Transcription callback
    )

    return Response(content=str(response), media_type='application/xml')

async def store_transcription(
    db: Session,
    CallSid: str,
    RecordingSid: str,
    From_: str,
    To_: str,
    messages: list,
    voicemail: bool,
    recording_url: str,
    call_duration_seconds: float  # Accept call duration as a float
):
    """Helper function to store the transcription in the database."""
    transcription = ManualCallTranscription(
        call_sid=CallSid,
        recording_sid=RecordingSid,
        caller_phone_number=From_,
        called_phone_number=To_,
        messages={'messages': messages},
        voicemail=voicemail,
        recording_url=recording_url,  # Store the recording URL
        call_duration_seconds=call_duration_seconds  # Store the call duration
    )
    db.add(transcription)
    db.commit()

    
async def transcribe_recording(RecordingUrl: str, RecordingSid: str) -> str:
    
    """Helper function to transcribe a recording from Twilio."""
    # Initialize Google Cloud clients with appropriate credentials
    transcription_service_account_file = os.path.join(
        project_root, 'service_account_files/transcription-service-account-file.json'
    )
    credentials = service_account.Credentials.from_service_account_file(
        transcription_service_account_file
    )
    speech_client = speech.SpeechClient(credentials=credentials)

    # Initialize Google Cloud Storage client
    storage_service_account_file = os.path.join(
        project_root, 'service_account_files/storage-service-account-file.json'
    )
    storage_client = storage.Client(credentials=credentials)

    # Specify GCS bucket name
    bucket_name = 'manual-call-transcript-recordings'
    bucket = storage_client.bucket(bucket_name)

    # Create a blob and upload the recording to GCS
    blob = bucket.blob(f'recordings/{RecordingSid}.wav')
    recording_url = RecordingUrl + '.wav'

    try:
        with requests.get(recording_url, auth=HTTPBasicAuth(account_sid, auth_token), stream=True) as recording_response:
            if recording_response.status_code != 200:
                raise Exception("Failed to download recording")

            buffer = BytesIO()
            for chunk in recording_response.iter_content(chunk_size=8192):
                buffer.write(chunk)
            buffer.seek(0)

            # Upload the buffer to GCS
            blob.upload_from_file(buffer)

        # Generate GCS URI
        gcs_uri = f'gs://{bucket_name}/recordings/{RecordingSid}.wav'
        
        # Configure recognition settings
        audio = speech.RecognitionAudio(uri=gcs_uri)
        config = speech.RecognitionConfig(
            encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
            sample_rate_hertz=8000,
            language_code='en-US',
            enable_speaker_diarization=True,
            diarization_speaker_count=2,
            model='phone_call'
        )

        # Transcribe the audio file
        operation = speech_client.long_running_recognize(config=config, audio=audio)
        response = operation.result(timeout=300)

        # Construct transcript text
        transcript = ''
        for result in response.results:
            transcript += result.alternatives[0].transcript + ' '

    finally:
        # Clean up by deleting the audio file from GCS
        blob.delete()

    return transcript


@router.post("/voicemail-transcribed")
async def voicemail_transcribed(
    request: Request,
    RecordingSid: str = Form(...),
    RecordingUrl: str = Form(...),
    CallSid: str = Form(...),
    db: Session = Depends(get_db)
):
    await validate_twilio_request(request)
    
    # Fetch the call details from Twilio
    call = client.calls(CallSid).fetch()
    From_ = call.from_formatted
    To_ = call.to_formatted
    call_duration = call.duration  # Fetch call duration in seconds

    # Transcribe the voicemail
    transcript = await transcribe_recording(RecordingUrl, RecordingSid)

    # Process the transcription text into messages
    messages = [{"role": "customer", "content": transcript}]
    
    # Store the transcription along with the recording URL and call duration
    await store_transcription(
        db, CallSid, RecordingSid, From_, To_, messages, voicemail=True, 
        recording_url=RecordingUrl, call_duration_seconds=float(call_duration)
    )
    
    return Response(content="Voicemail received and transcribed.", media_type='text/plain')




@router.post("/recording-completed")
async def recording_completed(
    request: Request,
    RecordingSid: str = Form(...),
    RecordingUrl: str = Form(...),
    CallSid: str = Form(...),
    db: Session = Depends(get_db)
):
    await validate_twilio_request(request)

    # Fetch the call details
    call = client.calls(CallSid).fetch()
    From_ = call.from_formatted
    To_ = call.to_formatted
    call_duration = call.duration  # Fetch call duration in seconds

    # Transcribe the recording
    transcript = await transcribe_recording(RecordingUrl, RecordingSid)
    
    # Process the transcription text into messages
    messages = await process_transcript_with_openai(transcript)

    # Store the transcription along with the recording URL and call duration
    await store_transcription(
        db, CallSid, RecordingSid, From_, To_, messages, voicemail=False, 
        recording_url=RecordingUrl, call_duration_seconds=float(call_duration)
    )

    return Response(content='Recording processed, transcription saved, and audio file deleted from GCS', media_type='text/plain')


async def process_transcript_with_openai(transcription_text):
    system_prompt = (
        "You are to process a transcription of a phone call. "
        "Divide the transcription into a list of messages with roles and content. "
        "The roles are either 'receptionist' or 'customer'. "
        "Ensure the messages are in chronological order and properly attributed. "
        "Here's an example of a transcript, and how the resulting messages should be formatted:\n"
        "Transcript: Hello, this is the receptionist. How may I help you? I'd like to make an appointment. "
        "Sure, what time would you like to come in? 3 PM works for me. "
        "Great, we'll see you then. Thank you. You're welcome.\n"
        "Messages: [{\"role\": \"receptionist\", \"content\": \"Hello, this is the receptionist. How may I help you?\"}, "
        "{\"role\": \"customer\", \"content\": \"I'd like to make an appointment.\"}, "
        "{\"role\": \"receptionist\", \"content\": \"Sure, what time would you like to come in?\"}, "
        "{\"role\": \"customer\", \"content\": \"3 PM works for me.\"}, "
        "{\"role\": \"receptionist\", \"content\": \"Great, we'll see you then.\"}, "
        "{\"role\": \"customer\", \"content\": \"Thank you.\"}, "
        "{\"role\": \"receptionist\", \"content\": \"You're welcome.\"}]"
        "It's critical that you only include the array in your response. Do not include any other text."
    )

    response = openai_client.chat.completions.create(
        model='gpt-4o-mini',
        messages=[
            {'role': 'system', 'content': system_prompt},
            {'role': 'user', 'content': "Transcript: " + transcription_text + "\nMessages: "}
        ],
        max_tokens=1500,
        temperature=0.2
    )

    assistant_reply = response.choices[0].message.content
    

    # Parse the assistant's reply into a Python list
    import json
    try:
        messages = json.loads(assistant_reply)
    except json.JSONDecodeError:
        # Handle parsing error
        messages = [{
            'role': 'general-transcript',
            'content': transcription_text
        }]

    return messages

