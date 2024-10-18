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

    # Handle recording status callbacks and process transcription with Google Speech-to-Text.
    await validate_twilio_request(request)
    
    # Get the call object
    call = client.calls(CallSid).fetch()

    # Get the call details
    From_ = call.from_formatted
    To_ = call.to_formatted
    
    # Initialize Google Cloud Speech-to-Text client with credentials
    transcription_service_account_file = os.path.join(
        project_root, 'service_account_files/transcription-service-account-file.json'
    )
    credentials = service_account.Credentials.from_service_account_file(
        transcription_service_account_file
    )
    speech_client = speech.SpeechClient(credentials=credentials)

    # Initialize Google Cloud Storage client with credentials
    storage_service_account_file = os.path.join(
        project_root, 'service_account_files/storage-service-account-file.json'
    )
    credentials = service_account.Credentials.from_service_account_file(
        storage_service_account_file
    )
    storage_client = storage.Client(credentials=credentials)

    # Specify your GCS bucket name
    bucket_name = 'manual-call-transcript-recordings'  # Replace with your bucket name
    bucket = storage_client.bucket(bucket_name)

    # Create a blob (object) in the bucket
    blob = bucket.blob(f'recordings/{RecordingSid}.wav')

    # Stream the recording from Twilio and upload to GCS
    recording_url = RecordingUrl + '.wav'

    try:
        with requests.get(
            recording_url,
            auth=HTTPBasicAuth(account_sid, auth_token),
            stream=True
        ) as recording_response:
            if recording_response.status_code != 200:
                return Response(content='Failed to download recording', media_type='text/plain', status_code=500)

            # Read the streamed data into a BytesIO buffer
            buffer = BytesIO()
            for chunk in recording_response.iter_content(chunk_size=8192):
                buffer.write(chunk)
            buffer.seek(0)

            # Upload the buffer to GCS
            blob.upload_from_file(buffer)

        # Generate the GCS URI for the uploaded audio file
        gcs_uri = f'gs://{bucket_name}/recordings/{RecordingSid}.wav'


        # Configure recognition settings
        audio = speech.RecognitionAudio(uri=gcs_uri)
                
        config = speech.RecognitionConfig(
            encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,  # Adjust if necessary
            sample_rate_hertz=8000,
            language_code='en-US',
            enable_speaker_diarization=True,
            diarization_speaker_count=2,
            model='phone_call'
        )

        # Asynchronously transcribe the audio file
        operation = speech_client.long_running_recognize(config=config, audio=audio)
        
        # Wait for the transcription operation to complete
        response = operation.result(timeout=300)
        
        # generate the transcription text
        transcript = ''
        for result in response.results:
            transcript += result.alternatives[0].transcript + ' '
        
        # Process the transcription results
        messages = await process_transcript_with_openai(transcript)
        
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

    except Exception as e:
        # Handle exceptions during the transcription process
        return Response(content=f'An error occurred: {e}', media_type='text/plain', status_code=500)
    finally:
        # Delete the audio file from GCS
        try:
            blob.delete()
        except Exception as delete_error:
            # Log the error or handle it as needed
            print(f"Failed to delete GCS object: {delete_error}")
            # Optionally, you can decide whether to fail the request or proceed

        # Ensure the database session is closed
        db.close()

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
    
    print(assistant_reply)

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

