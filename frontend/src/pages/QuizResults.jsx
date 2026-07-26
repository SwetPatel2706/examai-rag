import React, { useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ProgressBar } from '@/components/ui/shared';

// --- Mock data (replace with GET /quiz-attempts/:id when backend is ready) ---
const MOCK_RESULTS = {
  q1: {
    quizTitle: 'Arrays & Complexity',
    subject: 'Data Structures',
    score: 80,
    total: 3,
    correct: 2,   // 2 out of 3
    weakTopics: [
      { topic: 'Sorting Algorithms', accuracy: 33 },
    ],
    questions: [
      { id: 'qq1', stem: 'What is the time complexity of accessing an array element?', correct: 2, options: ['O(n)', 'O(log n)', 'O(1)', 'O(n²)'] },
      { id: 'qq2', stem: 'Which data structure uses LIFO ordering?', correct: 1, options: ['Queue', 'Stack', 'Heap', 'Linked List'] },
      { id: 'qq3', stem: 'Worst-case time complexity of QuickSort?', correct: 2, options: ['O(n log n)', 'O(n)', 'O(n²)', 'O(log n)'] },
    ],
    answers: { qq1: 2, qq2: 1, qq3: 0 }, // qq3 wrong
  },
};

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

  // Prefer live data passed from QuizTaking, fall back to mock
  const liveAnswers = location.state?.answers;
  const liveQuestions = location.state?.questions;

  const result = useMemo(() => {
    if (liveAnswers && liveQuestions) {
      const correct = liveQuestions.filter((q) => liveAnswers[q.id] === q.correct).length;
      const score = Math.round((correct / liveQuestions.length) * 100);
      return { score, correct, total: liveQuestions.length, questions: liveQuestions, answers: liveAnswers, weakTopics: [], quizTitle: '', subject: '' };
    }
    return MOCK_RESULTS[id] ?? null;
  }, [id, liveAnswers, liveQuestions]);

  if (!result) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <p className="text-on-surface-variant">Results not found.</p>
      </div>
    );
  }

  const grade = gradeLabel(result.score);

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center py-xl px-md" style={{ fontFamily: "'Geist Variable', sans-serif" }}>
      <div className="w-full max-w-2xl space-y-xl">
        {/* Score card */}
        <div className="bg-white rounded-3xl ambient-shadow p-lg text-center">
          <p className="font-label-sm text-label-sm text-secondary uppercase tracking-wider mb-sm">{result.subject || 'Quiz Complete'}</p>
          <h1 className="font-headline-lg text-headline-lg text-on-background mb-xs">{result.quizTitle || 'Results'}</h1>

          <div className={`w-28 h-28 rounded-full flex items-center justify-center mx-auto my-lg ${grade.bg}`}>
            <span className={`text-[56px] font-bold leading-none ${grade.color}`}>{grade.letter}</span>
          </div>

          <p className="font-display-lg text-display-lg text-on-background">{result.score}%</p>
          <p className="font-body-md text-body-md text-secondary mt-1">
            {result.correct} of {result.total} correct
          </p>

          <div className="mt-lg max-w-xs mx-auto">
            <ProgressBar value={result.score} />
          </div>
        </div>

        {/* Weak topics — own weak topics only, no classmate data */}
        {result.weakTopics.length > 0 && (
          <section className="bg-white rounded-2xl ambient-shadow p-md">
            <h2 className="font-label-md text-label-md font-bold text-error uppercase tracking-wider mb-md">
              Areas to Review
            </h2>
            <div className="space-y-3">
              {result.weakTopics.map((wt) => (
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
          <h2 className="font-label-md text-label-md font-bold uppercase tracking-wider text-secondary mb-md">Question Review</h2>
          <div className="space-y-3">
            {result.questions.map((q, qi) => {
              const userAns = result.answers[q.id];
              const isCorrect = userAns === q.correct;
              return (
                <div key={q.id} className={`bg-white rounded-2xl p-md border-l-4 ${isCorrect ? 'border-tertiary' : 'border-error'}`}>
                  <p className="font-label-sm text-label-sm text-secondary uppercase mb-1">Q{qi + 1}</p>
                  <p className="font-body-md text-body-md text-on-surface mb-3">{q.stem}</p>
                  <div className="space-y-1">
                    {q.options.map((opt, oi) => {
                      const isUser = userAns === oi;
                      const isAns = q.correct === oi;
                      return (
                        <div
                          key={oi}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-label-md ${
                            isAns ? 'bg-tertiary-fixed/30 text-tertiary font-bold' : isUser && !isAns ? 'bg-error-container text-error' : 'text-on-surface-variant'
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
              );
            })}
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
