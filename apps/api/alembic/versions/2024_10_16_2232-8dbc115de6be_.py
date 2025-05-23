"""empty message

Revision ID: 8dbc115de6be
Revises: db2bfa7f57b1
Create Date: 2024-10-16 22:32:42.019840

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8dbc115de6be'
down_revision: Union[str, None] = 'db2bfa7f57b1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_column('manual_call_transcription', 'transcription_sid')
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column('manual_call_transcription', sa.Column('transcription_sid', sa.VARCHAR(), autoincrement=False, nullable=True))
    # ### end Alembic commands ###
