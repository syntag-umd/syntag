"""empty message

Revision ID: 26ce0bd48402
Revises: b4981ab953fc
Create Date: 2024-08-22 23:45:01.321646

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "26ce0bd48402"
down_revision: Union[str, None] = "b4981ab953fc"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column("conversation", "cache")
    op.add_column(
        "conversation",
        sa.Column("cache", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )


def downgrade() -> None:
    pass
