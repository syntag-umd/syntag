from typing import Annotated, TypeVar
from pydantic import WrapValidator


def IgnoreValidationFunc(v, handler, info):
    """Allows you to use TypedDict and skip run time validation for fastAPI body"""
    return v


T = TypeVar("T")
IgnoreValidation = Annotated[T, WrapValidator(IgnoreValidationFunc)]
