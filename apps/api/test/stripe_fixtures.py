import pytest


def func_mocked_stripe_add_phone_number(monkeypatch):
    def _mocked_stripe_add_phone_number(stripe_customer_id):
        pass

    monkeypatch.setattr(
        "app.services.stripe.utils.stripe_add_phone_number",
        _mocked_stripe_add_phone_number,
    )


@pytest.fixture
def mocked_stripe_remove_phone_number(monkeypatch):
    def _mocked_stripe_remove_phone_number(stripe_customer_id):
        pass

    monkeypatch.setattr(
        "app.services.stripe.utils.stripe_remove_phone_number",
        _mocked_stripe_remove_phone_number,
    )


@pytest.fixture
def mocked_stripe_create_usage_record(monkeypatch):
    async def _mocked_stripe_create_usage_record(
        stripe_customer_id, price, quantity, idempotency_key
    ):
        pass

    monkeypatch.setattr(
        "app.services.stripe.utils.create_usage_record",
        _mocked_stripe_create_usage_record,
    )
