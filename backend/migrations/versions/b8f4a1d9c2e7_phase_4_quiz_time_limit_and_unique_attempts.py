"""phase_4_quiz_time_limit_and_unique_attempts

Revision ID: b8f4a1d9c2e7
Revises: 5345d834c216
Create Date: 2026-08-05 10:00:00.000000

Adds:
- quizzes.time_limit_seconds (optional per-quiz time limit, surfaced to the
  quiz-taking timer).
- UNIQUE (quiz_id, student_id) on quiz_attempts. This constraint is the
  database-level enforcement behind the Phase 4 duplicate-attempt policy:
  a client retry that triggers a second INSERT raises a unique violation,
  which the service catches and maps back to the existing attempt.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b8f4a1d9c2e7'
down_revision: Union[str, Sequence[str], None] = '5345d834c216'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('quizzes', sa.Column('time_limit_seconds', sa.Integer(), nullable=True))
    op.create_unique_constraint(
        'uq_quiz_attempt_student', 'quiz_attempts', ['quiz_id', 'student_id']
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint('uq_quiz_attempt_student', 'quiz_attempts', type_='unique')
    op.drop_column('quizzes', 'time_limit_seconds')
