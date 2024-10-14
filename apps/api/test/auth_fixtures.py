import test.stripe_fixtures
import pytest

# This is what it shoudl decode to
decoded_jwt = {
    "azp": "http://localhost:3000",
    "exp": 1714581689 * 10000,
    "external_id": "88ffcfc6-7b23-4c55-bd43-0f0c562529cb",
    "iat": 1714581629,
    "iss": "https://pleasing-unicorn-60.clerk.accounts.dev",
    "jti": "bcad85a3a1a7f314c837",
    "nbf": 1714581619,
    "sid": "sess_2fqG1xnzZA4heMuMGhTnHx0CsW2",
    "sub": "user_2fLPJfHpghBM04GnGFHwIgqhhy0",
}


@pytest.fixture
def mocked_jwt_decode(mocker, monkeypatch):
    # Patch the Client class in the twilio.rest module
    test.stripe_fixtures.func_mocked_stripe_add_phone_number(monkeypatch)
    mock_decode = mocker.patch("jwt.decode")

    # Configure the mock client instance
    mock_decode.return_value = decoded_jwt

    return mock_decode


# This is what it shoudl decode to
decoded_qstash_jwt = {
    "iss": "Upstash",
}


@pytest.fixture
def mocked_qstash_jwt_decode(mocker, monkeypatch):
    # Patch the Client class in the twilio.rest module
    test.stripe_fixtures.func_mocked_stripe_add_phone_number(monkeypatch)
    mock_decode = mocker.patch("jwt.decode")

    # Configure the mock client instance
    mock_decode.return_value = decoded_qstash_jwt

    return mock_decode


@pytest.fixture
def mocked_constant_time_compare(mocker):
    mocked = mocker.patch("hmac.compare_digest")

    # Configure the mock client instance
    mocked.return_value = True

    return mocked
