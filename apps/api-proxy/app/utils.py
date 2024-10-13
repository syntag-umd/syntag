from typing import List
import logging
from contextlib import contextmanager

@contextmanager
def suppress_library_logging(libraries: List[str], level=logging.CRITICAL):
    prev_levels = dict()
    for lib_name in libraries:
        logger = logging.getLogger(lib_name)
        prev_levels[lib_name] = logger.level
        logger.setLevel(level)
    try:
        yield
    finally:
        for lib_name, prev_level in prev_levels.items():
            logger = logging.getLogger(lib_name)
            logger.setLevel(prev_level)


def format_error_message(error):
    # Extract location and message
    location = "->".join(str(loc) for loc in error["loc"])
    msg = error["msg"]
    # Append additional context for 'max_items' or 'min_items' type validations
    if "max_items" in msg or "min_items" in msg:
        # Example: 'ensure this value has at most 2 items'
        item_count_msg = msg.split(" ")[-2]  # Extract the numeric value
        msg += f" (items allowed: {item_count_msg})"
    return f"{location}: {msg}"