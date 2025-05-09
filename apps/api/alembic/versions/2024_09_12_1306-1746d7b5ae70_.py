"""empty message

Revision ID: 1746d7b5ae70
Revises: bbfba5b01443
Create Date: 2024-09-12 13:06:43.047889

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "1746d7b5ae70"
down_revision: Union[str, None] = "bbfba5b01443"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column("user", sa.Column("account_balance_min", sa.Float(), nullable=True))
    op.add_column(
        "user", sa.Column("account_balance_recharge", sa.Float(), nullable=True)
    )
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_column("user", "account_balance_recharge")
    op.drop_column("user", "account_balance_min")
    # ### end Alembic commands ###
