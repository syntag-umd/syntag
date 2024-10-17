from google.oauth2 import service_account
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

environment = settings.ENVIRONMENT

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
    response = VoiceResponse()
    
    # Proceed with your logic
    response.say('Please note, this call will be recorded.')

    dial = Dial(
        record='record-from-answer',
        recording_status_callback=api_domain+'/record-call/recording-completed',
        recording_status_callback_method='POST'
    )
    dial.number('+18578691479')
    response.append(dial)

    return Response(content=str(response), media_type='application/xml')

@router.post("/recording-completed")
async def recording_completed(
    request: Request,
    RecordingSid: str = Form(...),
    RecordingUrl: str = Form(...),
    CallSid: str = Form(...),
    db: Session = Depends(get_db)
):
    
    # Get the call object
    call = client.calls(CallSid).fetch()
    
    # Get the call details
    From_ = call.from_formatted
    To_ = call.to_formatted
    
    """Handle recording status callbacks and process transcription with Google Speech-to-Text."""
    await validate_twilio_request(request)

    # Download the recording file from Twilio
    recording_response = requests.get(
        RecordingUrl + '.wav',
        auth=HTTPBasicAuth(account_sid, auth_token)
    )
    if recording_response.status_code != 200:
        return Response(content='Failed to download recording', media_type='text/plain', status_code=500)

    audio_content = recording_response.content

    # Initialize Google Cloud Speech client with credentials
    project_root = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))

    service_account_file = os.path.join(project_root, 'routes/record_call/service-account-file.json')
    credentials = service_account.Credentials.from_service_account_file(
        service_account_file
    )
    speech_client = speech.SpeechClient(credentials=credentials)

    # Configure recognition settings
    audio = speech.RecognitionAudio(content=audio_content)
    config = speech.RecognitionConfig(
        encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,  # Adjusted encoding
        sample_rate_hertz=8000,
        language_code='en-US',
        enable_speaker_diarization=True,
        diarization_speaker_count=2,
        model='phone_call'
    )

    # Asynchronously transcribe the audio file
    operation = speech_client.long_running_recognize(config=config, audio=audio)

    response = operation.result(timeout=300)

    # Process the transcription results
    messages = process_transcript(response)

    # Store transcription in the database
    transcription = ManualCallTranscription(
        call_sid=CallSid,
        recording_sid=RecordingSid,
        caller_phone_number=From_,
        called_phone_number=To_,
        messages={'messages': messages}
    )
    db.add(transcription)
    db.commit()
    db.close()

    return Response(content='Recording processed and transcription saved', media_type='text/plain')


def process_transcript(response):
    """Process the transcription response and format messages with speaker roles."""
    # Map speaker tags to roles
    speaker_roles = {
        1: 'receptionist',
        2: 'customer'
    }
    messages = []
    current_speaker = None
    current_text = ''

    for result in response.results:
        alternative = result.alternatives[0]
        for word_info in alternative.words:
            speaker_tag = word_info.speaker_tag
            word = word_info.word

            # Map the speaker_tag to a role
            role = speaker_roles.get(speaker_tag, 'unknown')

            if current_speaker != speaker_tag:
                # Save the current text if any
                if current_text:
                    messages.append({
                        'role': speaker_roles.get(current_speaker, 'unknown'),
                        'content': current_text.strip()
                    })
                    current_text = ''

                current_speaker = speaker_tag

            current_text += ' ' + word

    # Append the last message
    if current_text:
        messages.append({
            'role': speaker_roles.get(current_speaker, 'unknown'),
            'content': current_text.strip()
        })

    return messages
