from enum import Enum

from app.core.config import settings


# maps to the id of the price object on stripe
class Prices(str, Enum):
    PHONE_NUMBER = settings.STRIPE_PHONE_NUMBER_PRICE_ID
    AGENT_USAGE = settings.STRIPE_AGENT_USAGE_PRICE_ID
    ACCOUNT_BALANCE = settings.STRIPE_ACCOUNT_BALANCE_PRICE_ID
