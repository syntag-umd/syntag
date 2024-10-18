import logging
from typing import Optional, cast
from fastapi import APIRouter, Depends, HTTPException, Header, Request
from sqlalchemy import select
import stripe
from app.database.tables.user_journal_entry import AccountBalanceEntry, UserJournalEntry
from app.routes.billing.utils import create_account_balance_invoice
from sqlalchemy.orm import Session
from app.core.config import settings
from app.database.session import get_isolated_db
from app.database.tables.user import User
from app.services.stripe.types import Prices
from app.utils import get_user_from_req

router = APIRouter(prefix="/billing")


@router.post("/auto-recharge")
async def auto_recharge(user: User = Depends(get_user_from_req)):
    result = create_account_balance_invoice(user)
    return {"success": result}


@router.post("/stripe-webhooks")
async def stripe_webhook_handler(
    request: Request,
    stripe_sig: Optional[str] = Header(None, alias="Stripe-Signature"),
    db: Session = Depends(get_isolated_db),
):
    try:
        raw_body = await request.body()
    except Exception as e:
        logging.error(f"Error parsing payload: {repr(e)}")
        raise HTTPException(status_code=400, detail="Invalid body")

    try:
        if stripe_sig:
            event = stripe.Webhook.construct_event(
                raw_body,
                stripe_sig,
                settings.STRIPE_WEBHOOK_SECRET,
                api_key=settings.STRIPE_API_KEY,
            )
        else:
            raise HTTPException(status_code=401, detail="Invalid Authentication")
    except ValueError as e:
        logging.error(f"Error parsing payload: {repr(e)}")
        raise HTTPException(status_code=400, detail="Invalid payload")
    try:
        customer = event.data.object.get("customer")
        logging.info(f"Received event for stripe customer {customer}: {event}")
        event_id = event.id

        if event.type == "checkout.session.completed":
            checkout_session = event.data.object
            checkout_session_id: str = checkout_session.get("id")
            stmt = select(UserJournalEntry).where(
                UserJournalEntry.type == "account_balance",
                UserJournalEntry.type_data["checkout_session_id"].astext
                == checkout_session_id,
            )

            result = db.execute(stmt).first()
            if result:
                logging.info("Checkout session already processed")
                return {}

            customer: Optional[str] = checkout_session.get("customer")
            if customer is None:
                raise HTTPException(status_code=400, detail="Customer is None")
            user = db.query(User).filter(User.stripe_customer_id == customer).first()
            if not user:
                raise HTTPException(status_code=400, detail="User not found")

            cents_total: Optional[int] = checkout_session.get("amount_total")
            if cents_total is None:
                raise HTTPException(status_code=400, detail="Amount not found")

            dollars = cents_total / 100

            type_data = AccountBalanceEntry(
                event_id=event_id, checkout_session_id=checkout_session_id
            )
            new_entry = UserJournalEntry(
                amount=dollars,
                userUuid=user.uuid,
                type="account_balance",
                type_data=type_data,
            )

            user.account_balance += dollars

            db.add(new_entry)
            db.commit()

            logging.info(f"Successfully changed account balance by: {dollars}")
        elif event.type == "invoice.paid":

            invoice_id = event.data.object.get("id")
            if not invoice_id:
                raise HTTPException(status_code=400, detail="No invoice ID in event")
            stmt = select(UserJournalEntry).where(
                UserJournalEntry.type == "account_balance",
                UserJournalEntry.type_data["invoice_id"].astext == invoice_id,
            )

            result = db.execute(stmt).first()
            if result:
                logging.info("Invoice already processed")
                return {}

            invoice = stripe.Invoice.retrieve(invoice_id)
            if not invoice.customer:
                raise HTTPException(status_code=400, detail="No customer in invoice")

            customer_id = cast(str, invoice.customer)
            user = db.query(User).filter(User.stripe_customer_id == customer_id).first()
            if not user:
                raise HTTPException(status_code=400, detail="User not found")

            change_in_cents = 0
            for line in invoice.lines:
                if line.price and line.price.id == Prices.ACCOUNT_BALANCE:
                    change_in_cents += line.amount

            dollars = change_in_cents / 100
            type_data = AccountBalanceEntry(event_id=event_id, invoice_id=invoice_id)
            new_entry = UserJournalEntry(
                amount=dollars,
                userUuid=user.uuid,
                type="account_balance",
                type_data=type_data,
            )
            user.account_balance += dollars

            db.add(new_entry)
            db.commit()

        else:
            logging.debug("Unhandled event: {}".format(event))
            raise HTTPException(status_code=400, detail="Unhandled event")
    except Exception as e:
        raise HTTPException(
            status_code=500, detail="Error processing stripe event"
        ) from e
