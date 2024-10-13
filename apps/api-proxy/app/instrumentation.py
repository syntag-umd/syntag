import logging
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.trace import (
    set_tracer_provider,
)
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor
from opentelemetry.instrumentation.requests import RequestsInstrumentor
from opentelemetry.instrumentation.logging import LoggingInstrumentor
from opentelemetry.sdk._logs import LoggerProvider, LoggingHandler
from opentelemetry._logs import set_logger_provider
from opentelemetry.exporter.otlp.proto.http._log_exporter import OTLPLogExporter
from opentelemetry.sdk._logs.export import BatchLogRecordProcessor


global_tracer = TracerProvider()
set_tracer_provider(global_tracer)
global_tracer.add_span_processor(BatchSpanProcessor(OTLPSpanExporter()))

LoggingInstrumentor().instrument(set_logging_format=True)

logger_provider = LoggerProvider()
set_logger_provider(logger_provider)
log_exporter = OTLPLogExporter()
log_processor = BatchLogRecordProcessor(log_exporter)
logger_provider.add_log_record_processor(log_processor)

logging.getLogger().addHandler(LoggingHandler())

HTTPXClientInstrumentor().instrument()
RequestsInstrumentor().instrument()
