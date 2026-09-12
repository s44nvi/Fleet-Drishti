"""add evidence

Revision ID: 229aaf386ad1
Revises: 4583a0302ac2
Create Date: 2026-09-12 11:14:04.658734

"""
from alembic import op
import sqlalchemy as sa


revision = '229aaf386ad1'
down_revision = '4583a0302ac2'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'evidence',
        sa.Column('id', sa.UUID(as_uuid=False), nullable=False),
        sa.Column('event_id', sa.UUID(as_uuid=False), nullable=False),
        sa.Column('frame_path', sa.String(), nullable=True),
        sa.Column('video_path', sa.String(), nullable=True),
        sa.Column('timestamp', sa.DateTime(), nullable=False),
        sa.Column('lat', sa.Float(), nullable=False),
        sa.Column('lng', sa.Float(), nullable=False),
        sa.Column('bus_id', sa.UUID(as_uuid=False), nullable=False),
        sa.Column('route_id', sa.UUID(as_uuid=False), nullable=True),
        sa.Column('confidence', sa.Float(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['bus_id'], ['buses.id']),
        sa.ForeignKeyConstraint(['event_id'], ['events.id']),
        sa.ForeignKeyConstraint(['route_id'], ['routes.id']),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade():
    op.drop_table('evidence')