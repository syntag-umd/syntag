"""empty message

Revision ID: f76917474403
Revises: 9e4d2c0504bc
Create Date: 2024-08-22 21:35:37.682549

"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "f76917474403"
down_revision: Union[str, None] = "9e4d2c0504bc"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_unique_constraint(None, "conversation", ["vapiCallId"])
    op.drop_column("conversation", "assistantId")


def downgrade() -> None:
    pass
