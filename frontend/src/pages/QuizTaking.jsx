import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

// --- Mock data (replace with GET /quizzes/:id when backend is ready) ---
const MOCK_QUIZZES = {
  q1: {
    id: 'q1',
    title: 'Arrays & Complexity',
    subject: 'Data Structures',
    teacher: 'Dr. Eleanor Vance',
    timeLimitSeconds: 600, // 10 minutes
    questions: [
      {
        id: 'qq1',
        stem: 'What is the time complexity of accessing an element in an array by index?',
        options: ['O(n)', 'O(log n)', 'O(1)', 'O(n²)'],
        correct: 2,
      },
      {
        id: 'qq2',
        stem: 'Which data structure uses LIFO ordering?',
        options: ['Queue', 'Stack', 'Heap', 'Linked List'],
        correct: 1,
      },
      {
        id: 'qq3',
        stem: 'What is the worst-case time complexity of QuickSort?',
        options: ['O(n log n)', 'O(n)', 'O(n²)', 'O(log n)'],
        correct: 2,
      },
    ],
  },
  q2: {
    id: 'q2',
    title: 'Linked Lists Deep Dive',
    subject: 'Data Structures',
    teacher: 'Dr. Priya Nair',
    timeLimitSeconds: 900,
    questions: [
      {
        id: 'qq4',
        stem: 'In a singly linked list, each node contains a reference to which node?',
        options: ['Previous node', 'Next node', 'Both previous and next', 'Head node'],
        correct: 1,
      },
      {
        id: 'qq5',
        stem: 'What is the time complexity of inserting at the head of a linked list?',
        options: ['O(n)', 'O(log n)', 'O(1)', 'O(n²)'],
        correct: 2,
      },
    ],
  },
};

function formatTime(secs) {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// No sidebar — minimal chrome per agents.md spec for quiz-taking focus
export default function QuizTaking() {
  const { id } = useParams();
  const navigate = useNavigate();
  const quiz = MOCK_QUIZZES[id];

  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({}); // { questionId: optionIndex }
  const [timeLeft, setTimeLeft] = useState(quiz?.timeLimitSeconds ?? 600);
  const timerRef = useRef(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          submitQuiz();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!quiz) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <p className="text-on-surface-variant font-body-md text-body-md">Quiz not found.</p>
      </div>
    );
  }

  const question = quiz.questions[current];
  const total = quiz.questions.length;
  const progress = ((current + 1) / total) * 100;
  const isLast = current === total - 1;
  const isUrgent = timeLeft < 60;

  function selectOption(idx) {
    setAnswers((prev) => ({ ...prev, [question.id]: idx }));
  }

  function submitQuiz() {
    clearInterval(timerRef.current);
    navigate(`/student/quiz/${id}/results`, { state: { answers, questions: quiz.questions } });
  }

  return (
    <div
      className="min-h-screen bg-surface flex flex-col"
      style={{ fontFamily: "'Geist Variable', sans-serif" }}
    >
      {/* Top bar */}
      <header className="h-16 bg-white border-b border-outline-variant flex items-center justify-between px-xl shrink-0">
        <div>
          <p className="font-label-sm text-label-sm text-secondary uppercase tracking-wider">{quiz.subject}</p>
          <h1 className="font-headline-md text-headline-md text-on-background">{quiz.title}</h1>
        </div>
        <div className="flex items-center gap-md">
          {/* Timer */}
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-label-md text-label-md font-bold ${isUrgent ? 'bg-error-container text-error' : 'bg-primary-fixed text-primary'}`}>
            <span className="material-symbols-outlined text-[18px]">timer</span>
            {formatTime(timeLeft)}
          </div>
          {/* Progress label */}
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
      <main className="flex-1 flex items-center justify-center p-lg">
        <div className="w-full max-w-2xl">
          <p className="font-label-sm text-label-sm text-secondary uppercase tracking-wider mb-md">
            Question {current + 1} of {total}
          </p>
          <h2 className="font-headline-md text-headline-md text-on-background mb-xl">
            {question.stem}
          </h2>

          <div className="space-y-3">
            {question.options.map((opt, idx) => {
              const selected = answers[question.id] === idx;
              return (
                <button
                  key={idx}
                  onClick={() => selectOption(idx)}
                  className={`w-full text-left px-md py-md rounded-2xl border-2 transition-all duration-150 font-body-md text-body-md ${
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

      {/* Navigation footer */}
      <footer className="h-20 bg-white border-t border-outline-variant flex items-center justify-between px-xl shrink-0">
        <button
          disabled={current === 0}
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
            className="flex items-center gap-2 px-6 h-10 rounded-xl bg-primary text-on-primary font-label-md text-label-md hover:scale-95 transition-all"
          >
            Submit
            <span className="material-symbols-outlined text-[18px]">check</span>
          </button>
        ) : (
          <button
            onClick={() => setCurrent((c) => c + 1)}
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
