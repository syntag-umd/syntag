import json
import os
import traceback
from fastapi import FastAPI, Request, status
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# api key auth
from fastapi.security.api_key import APIKeyHeader, APIKeyQuery
from app.database.session import db_session
from app.routes.custom_llm.utils import warmup_custom_llm
from app.routes.whoami import router as whoami
from app.routes.vapi.route import router as vapi_router
from app.routes.embeddings import router as embeddings_router
from app.routes.custom_llm.custom_llm import router as custom_llm_router
from app.routes.billing.route import router as billing_router
from app.utils import format_error_message
from app.routes.test import router as test_router
from app.routes.squire.route import router as squire_router
from app.routes.record_call.route import router as record_call_router
from app.routes.sapi.route import router as sapi_router
from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi.exception_handlers import (
    http_exception_handler,
)
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from app.instrumentation import global_tracer

import logging

logging.basicConfig(level=logging.DEBUG)

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
        logging.error(
            f"Validation Exception Handler: {repr(exc)}\nRequest Url: {request.url}\nBody: {await request.body()}"
        )
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
        if exc.status_code >= 500:
            logging.error(
                f"HTTP Exception Handler: {repr(exc)}\nTraceback:\n{traceback.format_exc()}\nRequest Url:{request.url}\nBody: {await request.body()}"
            )
        else:
            logging.error(
                f"HTTP Exception Handler: {repr(exc)}\nRequest Url:{request.url}\nBody: {await request.body()}"
            )

        return await http_exception_handler(request, exc)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(sapi_router, tags=["SAPI"])
    app.include_router(vapi_router, tags=["VAPI"])
    app.include_router(embeddings_router, tags=["Embeddings"])
    app.include_router(whoami, tags=["Who Am I"])
    app.include_router(custom_llm_router, tags=["Custom LLM"])
    app.include_router(billing_router, tags=["Billing"])
    app.include_router(test_router, tags=["Test performance"])
    app.include_router(squire_router, tags=["Squire"])
    app.include_router(record_call_router, tags=["Record Call"])

    app.openapi_version = "3.0.0"

    @app.on_event("startup")
    async def startup_event():
        logging.info("===Startup event===")
        try:
            db = db_session()
            success, data = await warmup_custom_llm(db)
            if not success:
                logging.warn("Startup failed: " + json.dumps(data))
            else:
                logging.info("Startup successful")
        except Exception as e:
            logging.error(f"Startup event warmup: {e}")

    @app.on_event("shutdown")
    async def shutdown_event():
        logging.info("===Shutdown event===")

    logging.info("===Created app===")

    return app


app = create_app()

if __name__ == "__main__":
    # if run from command line with unicorn, this is not run
    import uvicorn

    port = int(os.environ.get("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
