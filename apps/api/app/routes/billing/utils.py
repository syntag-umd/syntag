from fastapi import HTTPException
from app.database.tables.user import User
from app.services.stripe.types import Prices
from app.services.stripe.utils import stripe


def create_account_balance_invoice(user: User):
    if (
        not user.account_balance_recharge_threshold
        or not user.account_balance_recharge_to
        or not user.account_balance_payment_method
    ):
        return False

    if user.account_balance < user.account_balance_recharge_threshold:
        difference = user.account_balance_recharge_to - user.account_balance
        cents = round(difference * 100)
        if cents <= 50:
            return False

        try:
            invoice = stripe.Invoice.create(
                customer=user.stripe_customer_id,
                auto_advance=True,
                collection_method="charge_automatically",
                default_payment_method=user.account_balance_payment_method,
            )
        except stripe.StripeError as e:
            raise HTTPException(
                status_code=500, detail=f"Failed to create invoice: {e.user_message}"
            ) from e
        if not invoice.id:
            raise HTTPException(
                status_code=500, detail="Failed to create invoice: no invoice id"
            )

        stripe.InvoiceItem.create(
            customer=user.stripe_customer_id,
            price=Prices.ACCOUNT_BALANCE.value,
            quantity=cents,
            invoice=invoice.id,
        )

        stripe.Invoice.finalize_invoice(invoice.id)

        stripe.Invoice.pay(invoice.id)

        return True
    return False
