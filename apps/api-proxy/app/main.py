import logging
import os
from fastapi import FastAPI, Request, status
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# api key auth
from fastapi.security.api_key import APIKeyHeader, APIKeyQuery
from app.routes.custom_llm import router as custom_llm_router


from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi.exception_handlers import (
    http_exception_handler,
)

from app.utils import format_error_message
from app.instrumentation import global_tracer
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor


api_key_query = APIKeyQuery(name="api_key")
api_key_header = APIKeyHeader(name="X-API-Key")


def create_app() -> FastAPI:
    app = FastAPI()

    FastAPIInstrumentor.instrument_app(
        app,
        tracer_provider=global_tracer,
    )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request, exc: RequestValidationError
    ):
        logging.error(f"Validation Error: {repr(exc)} ")
        logging.error(f"{request.url} {await request.body()}")
        # Retrieve errors
        errors = exc.errors()
        # Format the errors into a detailed single string message
        error_messages = "; ".join(format_error_message(error) for error in errors)
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=jsonable_encoder({"detail": error_messages}),
        )

    @app.exception_handler(StarletteHTTPException)
    async def custom_http_exception_handler(
        request: Request, exc: StarletteHTTPException
    ):
        logging.error(f"HTTPError: {repr(exc)} ")
        logging.error(f"{request.url} {await request.body()}")

        return await http_exception_handler(request, exc)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(custom_llm_router, tags=["Custom LLM"])

    app.openapi_version = "3.0.0"

    logging.info("===Created app===")

    return app


app = create_app()

if __name__ == "__main__":
    # if run from command line with unicorn, this is not run
    import uvicorn

    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
