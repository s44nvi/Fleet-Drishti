"""add issue confidence column

Revision ID: 1802f3e12057
Revises: 21966753552d
Create Date: 2026-09-22 22:41:42.984268

"""
from alembic import op
import sqlalchemy as sa


revision = '1802f3e12057'
down_revision = '21966753552d'
branch_labels = None
depends_on = None


def upgrade():
    # Note: an unrelated pre-existing schema drift (missing
    # uq_event_id unique constraint on events.id) was detected by
    # autogenerate but is intentionally left out of this migration,
    # which is scoped only to the new Issue.confidence column.
    op.add_column(
        'issues',
        sa.Column(
            'confidence',
            sa.Float(),
            nullable=False,
            server_default='0.0',
        ),
    )
    op.alter_column('issues', 'confidence', server_default=None)


def downgrade():
    op.drop_column('issues', 'confidence')
