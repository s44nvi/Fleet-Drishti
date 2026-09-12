"""add citizen reports

Revision ID: 3c46104337de
Revises: 229aaf386ad1
Create Date: 2026-09-12 11:33:37.357342

"""
from alembic import op
import sqlalchemy as sa


revision = '3c46104337de'
down_revision = '229aaf386ad1'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'citizen_reports',
        sa.Column('id', sa.UUID(as_uuid=False), nullable=False),
        sa.Column('description', sa.String(), nullable=True),
        sa.Column('photo_path', sa.String(), nullable=True),
        sa.Column('video_path', sa.String(), nullable=True),
        sa.Column('timestamp', sa.DateTime(), nullable=False),
        sa.Column('lat', sa.Float(), nullable=False),
        sa.Column('lng', sa.Float(), nullable=False),
        sa.Column('status', sa.String(), nullable=False),
        sa.Column('matched_issue_id', sa.UUID(as_uuid=False), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(
            ['matched_issue_id'],
            ['issues.id']
        ),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade():
    op.drop_table('citizen_reports')