"""empty message

Revision ID: 0d4eb90cdc08
Revises: a23df480bde1
Create Date: 2024-08-28 23:13:26.858130

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "0d4eb90cdc08"
down_revision: Union[str, None] = "a23df480bde1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column(
        "user",
        sa.Column(
            "onboarding_stage", sa.Integer(), server_default=sa.text("0"), nullable=True
        ),
    )
    op.drop_column("user", "has_completed_onboarding")
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column(
        "user",
        sa.Column(
            "has_completed_onboarding",
            sa.INTEGER(),
            server_default=sa.text("0"),
            autoincrement=False,
            nullable=False,
        ),
    )
    op.drop_column("user", "onboarding_stage")
    # ### end Alembic commands ###
