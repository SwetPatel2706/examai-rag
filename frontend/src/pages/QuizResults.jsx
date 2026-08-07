import React from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ProgressBar } from '@/components/ui/shared';
import { LoadingState, ErrorState } from '@/components/ui/states';
import { useApi } from '@/lib/useApi';
import { listMyAttempts } from '@/api/quizzes';

function gradeLabel(score) {
  if (score >= 90) return { letter: 'A', color: 'text-tertiary', bg: 'bg-tertiary-fixed/30' };
  if (score >= 80) return { letter: 'B', color: 'text-primary', bg: 'bg-primary-fixed' };
  if (score >= 70) return { letter: 'C', color: 'text-secondary', bg: 'bg-secondary-container' };
  return { letter: 'D', color: 'text-error', bg: 'bg-error-container' };
}

export default function QuizResults() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Prefer the graded attempt passed from QuizTaking; otherwise fetch it.
  const liveAttempt = location.state?.attempt;

  const { data: fetched, loading, error, reload } = useApi(
    async () => {
      if (liveAttempt) return liveAttempt;
      const attempts = await listMyAttempts({ quizId: id });
      return [...attempts].sort((a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0))[0] ?? null;
    },
    [id, liveAttempt?.id]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <LoadingState label="Loading results…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center px-sp-md">
        <ErrorState message={error.message} onRetry={reload} />
      </div>
    );
  }

  const attempt = fetched;
  if (!attempt) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <p className="text-on-surface-variant font-body-md text-body-md">No results found for this quiz.</p>
      </div>
    );
  }

  const grade = gradeLabel(attempt.score);
  const questions = attempt.questions || [];

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center py-sp-xl px-sp-md" style={{ fontFamily: "'Geist Variable', sans-serif" }}>
      <div className="w-full max-w-2xl space-y-sp-xl">
        {/* Score card */}
        <div className="bg-white rounded-3xl ambient-shadow p-sp-lg text-center">
          <p className="font-label-sm text-label-sm text-secondary uppercase tracking-wider mb-sp-sm">{attempt.subject || 'Quiz Complete'}</p>
          <h1 className="font-headline-lg text-headline-lg text-on-background mb-sp-xs">{attempt.quizTitle}</h1>

          <div className={`w-28 h-28 rounded-full flex items-center justify-center mx-auto my-sp-lg ${grade.bg}`}>
            <span className={`text-[56px] font-bold leading-none ${grade.color}`}>{grade.letter}</span>
          </div>

          <p className="font-display-lg text-display-lg text-on-background">{attempt.score}%</p>
          <p className="font-body-md text-body-md text-secondary mt-1">
            {attempt.correctCount} of {attempt.totalQuestions} correct
          </p>

          <div className="mt-sp-lg max-w-xs mx-auto">
            <ProgressBar value={attempt.score} />
          </div>
        </div>

        {/* Weak topics — own weak topics only, no classmate data */}
        {attempt.weakTopics.length > 0 && (
          <section className="bg-white rounded-2xl ambient-shadow p-sp-md">
            <h2 className="font-label-md text-label-md font-bold text-error uppercase tracking-wider mb-sp-md">
              Areas to Review
            </h2>
            <div className="space-y-3">
              {attempt.weakTopics.map((wt) => (
                <div key={wt.topic}>
                  <div className="flex justify-between text-label-md font-label-md mb-1">
                    <span className="text-on-surface">{wt.topic}</span>
                    <span className="text-error font-bold">{wt.accuracy}% accuracy</span>
                  </div>
                  <div className="w-full h-2 bg-error-container rounded-full overflow-hidden">
                    <div className="bg-error h-full rounded-full" style={{ width: `${wt.accuracy}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Question review */}
        <section>
          <h2 className="font-label-md text-label-md font-bold uppercase tracking-wider text-secondary mb-sp-md">Question Review</h2>
          <div className="space-y-3">
            {questions.map((q, qi) => (
              <div key={q.id} className={`bg-white rounded-2xl p-sp-md border-l-4 ${q.isCorrect ? 'border-tertiary' : 'border-error'}`}>
                <p className="font-label-sm text-label-sm text-secondary uppercase mb-1">Q{qi + 1}</p>
                <p className="font-body-md text-body-md text-on-surface mb-3">{q.stem}</p>
                <div className="space-y-1">
                  {q.options.map((opt, oi) => {
                    const isUser = q.selected === opt;
                    const isAns = q.correct === opt;
                    return (
                      <div
                        key={oi}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-label-md ${isAns ? 'bg-tertiary-fixed/30 text-tertiary font-bold' : isUser && !isAns ? 'bg-error-container text-error' : 'text-on-surface-variant'
                          }`}
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          {isAns ? 'check_circle' : isUser ? 'cancel' : 'radio_button_unchecked'}
                        </span>
                        {opt}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/student/quizzes')}
            className="flex-1 h-12 rounded-2xl border-2 border-outline-variant text-secondary font-label-md text-label-md hover:bg-surface-container-low transition-colors"
          >
            Back to Quizzes
          </button>
          <button
            onClick={() => navigate('/student/chat')}
            className="flex-1 h-12 rounded-2xl bg-primary text-on-primary font-label-md text-label-md hover:scale-[0.98] transition-all"
          >
            Ask ExamAI About Weak Topics
          </button>
        </div>
      </div>
    </div>
  );
}
