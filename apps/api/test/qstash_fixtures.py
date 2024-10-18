import pytest
from unittest.mock import MagicMock


@pytest.fixture
def mocked_qstash_client(mocker):
    mock_client_class = mocker.patch("upstash_qstash.Client")

    mock_client = mock_client_class.return_value
    mock_client.publish.return_value = MagicMock()
