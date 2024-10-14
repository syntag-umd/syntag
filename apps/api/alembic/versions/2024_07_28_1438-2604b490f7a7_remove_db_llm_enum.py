"""remove-db-llm-enum

Revision ID: 2604b490f7a7
Revises: 7500c8efaae6
Create Date: 2024-07-28 14:38:24.393296

"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "2604b490f7a7"
down_revision: Union[str, None] = "7500c8efaae6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute('DROP TYPE "LLM"')


def downgrade() -> None:
    pass
