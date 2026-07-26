import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { ProgressBar, SectionHeader } from '@/components/ui/shared';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

// --- Mock data (replace with API /subjects/:id when backend is ready) ---
const MOCK_SUBJECT = {
  s1: {
    id: 's1',
    name: 'Data Structures',
    description: 'Arrays, linked lists, trees, graphs, and algorithm complexity analysis.',
    progress: 75,
    teachers: [
      { id: 't1', name: 'Dr. Eleanor Vance', email: 'e.vance@uni.edu' },
      { id: 't2', name: 'Dr. Priya Nair', email: 'p.nair@uni.edu' },
    ],
    materialsByTeacher: [
      {
        teacher: { id: 't1', name: 'Dr. Eleanor Vance' },
        materials: [
          { id: 'm1', name: 'Week 1 — Arrays & Complexity.pdf', type: 'PDF' },
          { id: 'm2', name: 'Week 2 — Linked Lists.pdf', type: 'PDF' },
        ],
      },
      {
        teacher: { id: 't2', name: 'Dr. Priya Nair' },
        materials: [
          { id: 'm3', name: 'Graph Algorithms — Lecture Notes.pdf', type: 'PDF' },
        ],
      },
    ],
    quizzes: [
      { id: 'q1', title: 'Arrays & Complexity', questions: 10, status: 'completed', score: 80 },
      { id: 'q2', title: 'Linked Lists Deep Dive', questions: 15, status: 'not_started', score: null },
    ],
  },
};

// Fallback for unknown IDs
const FALLBACK = {
  id: 'unknown',
  name: 'Subject',
  description: '',
  progress: 0,
  teachers: [],
  materialsByTeacher: [],
  quizzes: [],
};

const STATUS_STYLES = {
  completed: 'bg-tertiary-fixed/30 text-tertiary',
  in_progress: 'bg-primary-fixed text-primary',
  not_started: 'bg-surface-container-high text-on-surface-variant',
};

const STATUS_LABELS = {
  completed: 'Completed',
  in_progress: 'In Progress',
  not_started: 'Not Started',
};

function TeacherChip({ teacher }) {
  const initials = teacher.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div className="flex items-center gap-2 bg-white border border-outline-variant rounded-full px-3 py-1.5">
      <Avatar size="sm">
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
      <div>
        <p className="font-label-md text-label-md text-on-surface">{teacher.name}</p>
        <p className="text-[11px] text-secondary">{teacher.email}</p>
      </div>
    </div>
  );
}

export default function SubjectOverview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const subject = MOCK_SUBJECT[id] ?? { ...FALLBACK, id, name: `Subject ${id}` };

  return (
    <AppLayout role="student">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 mb-lg text-on-surface-variant font-label-md text-label-md">
        <button onClick={() => navigate('/student')} className="hover:text-primary transition-colors">Home</button>
        <span className="material-symbols-outlined text-[16px]">chevron_right</span>
        <span className="text-on-surface">{subject.name}</span>
      </nav>

      {/* Header */}
      <header className="mb-xl">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-md">
          <div>
            <h1 className="font-headline-lg text-headline-lg text-on-background mb-2">{subject.name}</h1>
            <p className="font-body-md text-body-md text-secondary max-w-xl">{subject.description}</p>
          </div>
          <button
            onClick={() => navigate('/student/chat')}
            className="h-12 px-8 bg-primary text-on-primary font-label-md text-label-md rounded-full flex items-center gap-2 hover:scale-95 transition-all duration-150 shadow-md shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>chat_bubble</span>
            Ask About This Subject
          </button>
        </div>

        {/* Progress */}
        <div className="mt-lg max-w-sm">
          <div className="flex justify-between mb-1 text-[12px] font-label-md">
            <span className="text-secondary">Overall Progress</span>
            <span className="text-on-background font-bold">{subject.progress}%</span>
          </div>
          <ProgressBar value={subject.progress} />
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
        {/* Left — Teachers + Materials */}
        <div className="lg:col-span-2 space-y-xl">
          {/* Teachers */}
          <section>
            <SectionHeader title="Instructors" />
            <div className="flex flex-wrap gap-3">
              {subject.teachers.map((t) => <TeacherChip key={t.id} teacher={t} />)}
            </div>
          </section>

          {/* Materials grouped by teacher */}
          <section>
            <SectionHeader title="Study Materials" />
            <div className="space-y-lg">
              {subject.materialsByTeacher.map(({ teacher, materials }) => (
                <div key={teacher.id}>
                  <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-2">
                    {teacher.name}
                  </p>
                  <div className="space-y-2">
                    {materials.map((mat) => (
                      <div key={mat.id} className="flex items-center gap-3 bg-white p-3 rounded-xl border border-outline-variant ambient-shadow-sm">
                        <div className="w-9 h-9 rounded-lg bg-primary-fixed flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-primary text-[18px]">description</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-label-md text-label-md text-on-surface truncate">{mat.name}</p>
                          <p className="text-[11px] text-secondary uppercase">{mat.type}</p>
                        </div>
                        <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">{mat.type}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right — Quizzes */}
        <div>
          <SectionHeader
            title="Quizzes"
            action={
              <button
                onClick={() => navigate('/student/quizzes')}
                className="text-primary font-label-md text-label-md hover:underline flex items-center gap-1"
              >
                All <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            }
          />
          <div className="space-y-3">
            {subject.quizzes.map((quiz) => (
              <div key={quiz.id} className="bg-white p-md rounded-2xl ambient-shadow card-hover">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <h3 className="font-label-md text-label-md text-on-surface font-semibold">{quiz.title}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold shrink-0 ${STATUS_STYLES[quiz.status]}`}>
                    {STATUS_LABELS[quiz.status]}
                  </span>
                </div>
                <p className="font-label-sm text-label-sm text-secondary mb-3">{quiz.questions} questions</p>
                {quiz.status === 'completed' && quiz.score !== null && (
                  <p className="font-label-sm text-label-sm text-tertiary font-bold mb-3">Score: {quiz.score}%</p>
                )}
                <button
                  onClick={() => navigate(quiz.status === 'completed' ? `/student/quiz/${quiz.id}/results` : `/student/quiz/${quiz.id}`)}
                  className="w-full h-9 bg-primary text-on-primary rounded-xl font-label-md text-label-md hover:scale-[0.98] transition-all"
                >
                  {quiz.status === 'completed' ? 'View Results' : 'Start Quiz'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
