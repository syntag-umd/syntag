"""generating the vector store id column

Revision ID: 93e32438b721
Revises: 9f622551b874
Create Date: 2024-07-16 01:03:38.206727

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '93e32438b721'
down_revision: Union[str, None] = '9f622551b874'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column('voice_assistant', sa.Column('vector_store_id', sa.Text(), nullable=True))
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_column('voice_assistant', 'vector_store_id')
    # ### end Alembic commands ###
