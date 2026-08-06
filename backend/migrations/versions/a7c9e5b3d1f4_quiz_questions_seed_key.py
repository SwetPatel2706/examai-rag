"""quiz_questions_seed_key

Revision ID: a7c9e5b3d1f4
Revises: b8f4a1d9c2e7
Create Date: 2026-08-06 12:00:00.000000

Adds:
- quiz_questions.seed_key (nullable String) — a stable dataset identifier
  assigned by the seeder for seeded questions. Reconciliation in ``app/seed.py``
  matches on this key so editing a seeded question's text updates the row in
  place instead of creating a replacement that would orphan
  ``quiz_attempts.answers`` entries referencing the removed question id.
  NULL for teacher-authored / AI-generated questions, which are never
  reconciled by the seeder.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a7c9e5b3d1f4'
down_revision: Union[str, Sequence[str], None] = 'b8f4a1d9c2e7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('quiz_questions', sa.Column('seed_key', sa.String(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('quiz_questions', 'seed_key')
