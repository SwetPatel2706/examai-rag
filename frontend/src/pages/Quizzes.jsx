import React from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { SectionHeader } from '@/components/ui/shared';
import { cn } from '@/lib/utils';

// --- Mock data (replace with GET /quizzes?role=student when backend is ready) ---
const QUIZZES = [
  {
    id: 'q1',
    title: 'Arrays & Complexity',
    subject: 'Data Structures',
    teacher: 'Dr. Eleanor Vance',
    questions: 10,
    dueDate: '2026-08-01',
    status: 'completed',
    score: 80,
  },
  {
    id: 'q2',
    title: 'Linked Lists Deep Dive',
    subject: 'Data Structures',
    teacher: 'Dr. Priya Nair',
    questions: 15,
    dueDate: '2026-08-10',
    status: 'not_started',
    score: null,
  },
  {
    id: 'q3',
    title: 'Supply & Demand Fundamentals',
    subject: 'Macroeconomics',
    teacher: 'Prof. Julian Thorne',
    questions: 12,
    dueDate: '2026-08-05',
    status: 'in_progress',
    score: null,
  },
  {
    id: 'q4',
    title: 'Matrix Operations',
    subject: 'Linear Algebra',
    teacher: 'Dr. Sarah Chen',
    questions: 8,
    dueDate: '2026-08-15',
    status: 'not_started',
    score: null,
  },
];

const STATUS_CONFIG = {
  completed: { label: 'Completed', bg: 'bg-tertiary-fixed/30 text-tertiary', icon: 'check_circle' },
  in_progress: { label: 'In Progress', bg: 'bg-primary-fixed text-primary', icon: 'pending' },
  not_started: { label: 'Not Started', bg: 'bg-surface-container-high text-on-surface-variant', icon: 'radio_button_unchecked' },
};

function QuizCard({ quiz, onAction }) {
  const cfg = STATUS_CONFIG[quiz.status] ?? STATUS_CONFIG.not_started;
  return (
    <div className="bg-white rounded-2xl ambient-shadow card-hover p-sp-md flex flex-col gap-3">
      {/* Subject + Status */}
      <div className="flex items-center justify-between">
        <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider">{quiz.subject}</span>
        <span className={cn('flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold', cfg.bg)}>
          <span className="material-symbols-outlined text-[14px]">{cfg.icon}</span>
          {cfg.label}
        </span>
      </div>

      {/* Title */}
      <h3 className="font-headline-md text-[18px] text-on-background">{quiz.title}</h3>

      {/* Meta */}
      <div className="flex items-center gap-4 text-secondary font-label-sm text-label-sm">
        <span className="flex items-center gap-1">
          <span className="material-symbols-outlined text-[16px]">help_outline</span>
          {quiz.questions} questions
        </span>
        <span className="flex items-center gap-1">
          <span className="material-symbols-outlined text-[16px]">person</span>
          {quiz.teacher}
        </span>
        <span className="flex items-center gap-1">
          <span className="material-symbols-outlined text-[16px]">calendar_today</span>
          Due {quiz.dueDate}
        </span>
      </div>

      {quiz.status === 'completed' && quiz.score !== null && (
        <p className="font-label-md text-label-md text-tertiary font-bold">Score: {quiz.score}%</p>
      )}

      {/* Action */}
      <button
        onClick={() => onAction(quiz)}
        className={cn(
          'mt-auto h-10 rounded-xl font-label-md text-label-md transition-all hover:scale-[0.98]',
          quiz.status === 'completed'
            ? 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container'
            : 'bg-primary text-on-primary'
        )}
      >
        {quiz.status === 'completed' ? 'View Results' : quiz.status === 'in_progress' ? 'Continue' : 'Start Quiz'}
      </button>
    </div>
  );
}

export default function Quizzes() {
  const navigate = useNavigate();

  function handleAction(quiz) {
    if (quiz.status === 'completed') {
      navigate(`/student/quiz/${quiz.id}/results`);
    } else {
      navigate(`/student/quiz/${quiz.id}`);
    }
  }

  return (
    <AppLayout role="student">
      <header className="mb-sp-xl">
        <h1 className="font-headline-lg text-headline-lg text-on-background">Available Quizzes</h1>
        <p className="font-body-md text-body-md text-secondary mt-1">
          Teacher-authored quizzes across all your enrolled subjects.
        </p>
      </header>

      <SectionHeader title={`All Quizzes (${QUIZZES.length})`} />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-gutter">
        {QUIZZES.map((quiz) => (
          <QuizCard key={quiz.id} quiz={quiz} onAction={handleAction} />
        ))}
      </div>
    </AppLayout>
  );
}
