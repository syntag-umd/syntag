# define settings
# Path: app/core/config.py

import os
from typing import Literal, Optional

from dotenv import load_dotenv
from fastapi import Request
from pydantic_settings import BaseSettings, SettingsConfigDict

project_root = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))

load_dotenv(os.path.join(project_root, ".env.local"))
# needed for OTEL
load_dotenv(os.path.join(project_root, ".env.development"))

current_env = os.getenv("ENVIRONMENT")

# Define the Settings class to automatically load environment variables.


class Settings(BaseSettings):
    ADMIN_KEY: str = ""
    APIFY_TOKEN: str = ""
    APIFY_SQUIRE_BOOKING_SCRAPER_ACTOR_ID: str = ""
    AZURE_AI_HUB_KEY: str = ""
    AZURE_AI_HUB_KEY_WESTUS3: str = ""
    AZURE_AI_HUB_KEY_CANADAEAST: str = ""
    AZURE_DOCUMENT_INTELLIGENCE_API_KEY: str = ""
    BASE_URL: Optional[str] = None
    DATABASE_URL: str = ""
    DIRECT_URL: str = ""
    ENVIRONMENT: Optional[str] = "development"  # default value
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = ""
    GC_PROJECT_ID: str = ""
    GC_SERVICE_EMAIL: str = ""
    GC_SERVICE_PRIVATE_KEY: str = ""
    LOGGING_WARMUP_CUSTOM_LLM: Literal["info", "error", "none"] = "error"
    OPENAI_API_KEY: str = ""
    OTEL_EXPORTER_OTLP_ENDPOINT: str = ""
    OTEL_EXPORTER_OTLP_HEADERS: str = ""
    OTEL_EXPORTER_OTLP_PROTOCOL: str = "http/protobuf"
    OTEL_INSTRUMENTATION_HTTP_CAPTURE_HEADERS_SERVER_RESPONSE: str = ""
    OTEL_INSTRUMENTATION_HTTP_CAPTURE_HEADERS_SERVER_REQUEST: str = ""
    OTEL_PYTHON_LOG_CORRELATION: str = ""
    OTEL_SERVICE_NAME: str = ""
    OTEL_TRACES_EXPORTER: str = ""
    PINECONE_API_KEY: str = ""
    PINECONE_HOST: str = ""
    PUBLIC_KEY_PEM_CLERK: str = ""
    QSTASH_TOKEN: str = ""
    QSTASH_CURRENT_SIGNING_KEY: str = ""
    STRIPE_API_KEY: str = ""
    STRIPE_AGENT_USAGE_PRICE_ID: str = ""
    STRIPE_PHONE_NUMBER_PRICE_ID: str = ""
    STRIPE_ACCOUNT_BALANCE_PRICE_ID: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    VAPI_API_KEY: str = ""
    VAPI_SECRET: str = ""
    VERCEL_KV_URL: str = ""
    VERCEL_KV_REST_API_URL: str = ""
    VERCEL_KV_REST_API_TOKEN: str = ""
    VERCEL_KV_REST_API_READ_ONLY_TOKEN: str = ""
    ZILLIZ_CLOUD_REGION: str = ""
    ZILLIZ_API_KEY: str = ""
    ZILLIZ_PROJECT_ID: str = ""

    model_config = SettingsConfigDict(
        env_file=os.path.join(project_root, ".env.development"),
        extra="ignore",
    )

    def __init__(self) -> None:
        super().__init__()
        self.PUBLIC_KEY_PEM_CLERK = self.PUBLIC_KEY_PEM_CLERK.replace("\\n", "\n")
        self.GC_SERVICE_PRIVATE_KEY = self.GC_SERVICE_PRIVATE_KEY.replace("\\n", "\n")


# Initialize settings from the environment
settings = Settings()


def get_base_url(request: Request):
    """
    Should include the protocol and the domain.
    - On azure, the base_url will be http instead of https.
    Be aware of that."""
    if settings.BASE_URL:
        base_url = settings.BASE_URL
    else:
        base_url = str(request.base_url)

    return base_url.rstrip("/")
