import uuid
from typing import List, Optional

import stripe

from app.core.config import settings
from app.services.stripe.types import Prices

stripe.api_key = settings.STRIPE_API_KEY


async def create_usage_record(
    stripe_customer_id: str,
    price: Prices,
    quantity: int = 1,
    idempotency_key: Optional[str] = None,
):
    if idempotency_key is None:
        idempotency_key = str(uuid.uuid4())
    stripe_customer = stripe.Customer.retrieve(
        stripe_customer_id, expand=["subscriptions"]
    )
    subscriptions = stripe_customer.subscriptions
    sub_item_id = None
    for sub in subscriptions:
        sub_items = sub["items"].data
        for si in sub_items:
            if si.price.id == price.value:
                sub_item_id = si.id
                break
        if sub_item_id:
            break

    res = stripe.SubscriptionItem.create_usage_record(
        subscription_item=sub_item_id,
        quantity=quantity,
        idempotency_key=idempotency_key,
    )

    return res


async def stripe_add_phone_number(stripe_customer_id: str):
    stripe_customer = stripe.Customer.retrieve(
        stripe_customer_id, expand=["subscriptions"]
    )
    subscriptions = stripe_customer.subscriptions
    for sub in subscriptions:
        sub_items: List[stripe.SubscriptionItem] = sub["items"].data
        sub_item_id = None
        for si in sub_items:
            if si.price.id == Prices.PHONE_NUMBER:
                sub_item = si
                break
        if sub_item_id:
            break

    stripe.SubscriptionItem.modify(
        sub_item.id, quantity=sub_item.quantity + 1, proration_behavior="none"
    )

    stripe.InvoiceItem.create(
        customer=stripe_customer_id,
        price=Prices.PHONE_NUMBER,
        quantity=1,
        description="Added a phone number",
    )

    invoice = stripe.Invoice.create(customer=stripe_customer_id, auto_advance=True)
    return invoice


async def stripe_remove_phone_number(stripe_customer_id: str):
    stripe_customer = stripe.Customer.retrieve(
        stripe_customer_id, expand=["subscriptions"]
    )
    subscriptions = stripe_customer.subscriptions
    for sub in subscriptions:
        sub_items: List[stripe.SubscriptionItem] = sub["items"].data
        sub_item_id = None
        for si in sub_items:
            if si.price.id == Prices.PHONE_NUMBER:
                sub_item = si
                break
        if sub_item_id:
            break

    mod = stripe.SubscriptionItem.modify(
        sub_item.id, quantity=sub_item.quantity - 1, proration_behavior="none"
    )
    return mod
