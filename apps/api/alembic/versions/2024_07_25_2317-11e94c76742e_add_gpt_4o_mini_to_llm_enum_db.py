"""add GPT_4O_MINI to LLM Enum db

Revision ID: 11e94c76742e
Revises: f9ef642c9f6c
Create Date: 2024-07-25 23:17:31.138881

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "11e94c76742e"
down_revision: Union[str, None] = "f9ef642c9f6c"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(sa.text("ALTER TYPE \"LLM\" ADD VALUE 'GPT_4O_MINI'"))


def downgrade() -> None:
    op.execute(sa.text("ALTER TYPE \"LLM\" DROP VALUE 'GPT_4O_MINI'"))
