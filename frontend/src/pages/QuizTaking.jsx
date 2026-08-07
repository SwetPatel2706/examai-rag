import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { LoadingState, ErrorState } from '@/components/ui/states';
import { getQuiz, submitAttempt } from '@/api/quizzes';

function formatTime(secs) {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// No sidebar — minimal chrome per agents.md spec for quiz-taking focus
export default function QuizTaking() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [submitError, setSubmitError] = useState(null);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({}); // { questionId: optionIndex }
  const [timeLeft, setTimeLeft] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const timerRef = useRef(null);
  const submittedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    getQuiz(id)
      .then((data) => {
        if (cancelled) return;
        setQuiz(data);
        if (data.timeLimitSeconds) {
          setTimeLeft(data.timeLimitSeconds);
          timerRef.current = setInterval(() => {
            setTimeLeft((t) => (t <= 1 ? 0 : t - 1));
          }, 1000);
        }
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err);
      });
    return () => {
      cancelled = true;
      clearInterval(timerRef.current);
    };
  }, [id]);

  const submitQuiz = useCallback(async () => {
    if (submittedRef.current || !quiz) return;
    submittedRef.current = true;
    clearInterval(timerRef.current);
    setSubmitting(true);
    setSubmitError(null);
    try {
      // Backend grades option TEXT strings — map { questionId: optionIndex } → text.
      const textAnswers = {};
      for (const [qid, idx] of Object.entries(answers)) {
        const question = quiz.questions.find((q) => q.id === qid);
        if (question && question.options[idx] !== undefined) textAnswers[qid] = question.options[idx];
      }
      const attempt = await submitAttempt({ quizId: id, answers: textAnswers });
      navigate(`/student/quiz/${id}/results`, { state: { attempt } });
    } catch (err) {
      submittedRef.current = false;
      setSubmitting(false);
      setSubmitError(err);
    }
  }, [quiz, answers, id, navigate]);

  useEffect(() => {
    if (timeLeft === 0 && quiz) submitQuiz();
  }, [timeLeft, quiz, submitQuiz]);

  if (loadError) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center px-sp-md">
        <ErrorState message={loadError.message} onRetry={() => window.location.reload()} />
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <LoadingState label="Loading quiz…" />
      </div>
    );
  }

  const question = quiz.questions[current];
  const total = quiz.questions.length;
  const progress = ((current + 1) / total) * 100;
  const isLast = current === total - 1;
  const isUrgent = timeLeft !== null && timeLeft < 60;

  function selectOption(idx) {
    setAnswers((prev) => ({ ...prev, [question.id]: idx }));
  }

  return (
    <div
      className="min-h-screen bg-surface flex flex-col"
      style={{ fontFamily: "'Geist Variable', sans-serif" }}
    >
      {/* Top bar */}
      <header className="h-16 bg-white border-b border-outline-variant flex items-center justify-between px-sp-xl shrink-0">
        <div>
          <h1 className="font-headline-md text-headline-md text-on-background">{quiz.topic}</h1>
        </div>
        <div className="flex items-center gap-sp-md">
          {timeLeft !== null && (
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-label-md text-label-md font-bold ${isUrgent ? 'bg-error-container text-error' : 'bg-primary-fixed text-primary'}`}>
              <span className="material-symbols-outlined text-[18px]">timer</span>
              {formatTime(timeLeft)}
            </div>
          )}
          <span className="font-label-md text-label-md text-secondary">
            {current + 1} / {total}
          </span>
        </div>
      </header>

      {/* Progress bar */}
      <div className="w-full h-1 bg-surface-container-high shrink-0">
        <div className="bg-primary h-full transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>

      {/* Question */}
      <main className="flex-1 flex items-center justify-center p-sp-lg">
        <div className="w-full max-w-2xl">
          <p className="font-label-sm text-label-sm text-secondary uppercase tracking-wider mb-sp-md">
            Question {current + 1} of {total}
          </p>
          <h2 className="font-headline-md text-headline-md text-on-background mb-sp-xl">
            {question.stem}
          </h2>

          <div className="space-y-3">
            {question.options.map((opt, idx) => {
              const selected = answers[question.id] === idx;
              return (
                <button
                  key={idx}
                  onClick={() => selectOption(idx)}
                  disabled={submitting}
                  className={`w-full text-left px-sp-md py-sp-md rounded-2xl border-2 transition-all duration-150 font-body-md text-body-md ${
                    selected
                      ? 'border-primary bg-primary-fixed text-primary font-semibold'
                      : 'border-outline-variant bg-white text-on-surface hover:border-primary/40 hover:bg-primary-fixed/10'
                  }`}
                >
                  <span className={`inline-flex w-7 h-7 rounded-full mr-3 items-center justify-center text-[13px] font-bold ${selected ? 'bg-primary text-on-primary' : 'bg-surface-container text-secondary'}`}>
                    {String.fromCharCode(65 + idx)}
                  </span>
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      </main>

      {/* Submission failure banner (distinct from loadError above) */}
      {submitError && (
        <div role="alert" className="px-sp-xl pt-2">
          <div className="bg-error-container text-error rounded-2xl px-sp-md py-sp-sm text-body-sm flex items-center justify-between gap-3">
            <span>Your answer could not be submitted: {submitError.message}</span>
            <button
              onClick={submitQuiz}
              className="shrink-0 h-9 px-4 rounded-lg bg-error text-on-error font-label-md text-label-md"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Navigation footer */}
      <footer className="h-20 bg-white border-t border-outline-variant flex items-center justify-between px-sp-xl shrink-0">
        <button
          disabled={current === 0 || submitting}
          onClick={() => setCurrent((c) => c - 1)}
          className="flex items-center gap-2 px-6 h-10 rounded-xl border border-outline-variant text-secondary font-label-md text-label-md disabled:opacity-40 hover:bg-surface-container-low transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Previous
        </button>

        {/* Dot indicators */}
        <div className="flex gap-2">
          {quiz.questions.map((q, i) => (
            <button
              key={q.id}
              onClick={() => setCurrent(i)}
              disabled={submitting}
              className={`w-2.5 h-2.5 rounded-full transition-all ${
                i === current ? 'bg-primary scale-125' : answers[q.id] !== undefined ? 'bg-tertiary' : 'bg-outline-variant'
              }`}
              title={`Question ${i + 1}`}
            />
          ))}
        </div>

        {isLast ? (
          <button
            onClick={submitQuiz}
            disabled={submitting}
            className="flex items-center gap-2 px-6 h-10 rounded-xl bg-primary text-on-primary font-label-md text-label-md hover:scale-95 transition-all"
          >
            {submitting ? 'Submitting…' : 'Submit'}
            <span className="material-symbols-outlined text-[18px]">check</span>
          </button>
        ) : (
          <button
            onClick={() => setCurrent((c) => c + 1)}
            disabled={submitting}
            className="flex items-center gap-2 px-6 h-10 rounded-xl bg-primary text-on-primary font-label-md text-label-md hover:scale-95 transition-all"
          >
            Next
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </button>
        )}
      </footer>
    </div>
  );
}
