import React from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { StatCard, SectionHeader, ProgressBar } from '@/components/ui/shared';

// --- Mock data (replace with API calls when backend is ready) ---
const QUICK_STATS = [
  { icon: 'assignment', iconBg: 'bg-primary-fixed', iconColor: 'text-primary', value: '12', label: 'Quizzes Taken' },
  { icon: 'trending_down', iconBg: 'bg-error-container', iconColor: 'text-error', value: '4', label: 'Weak Topics' },
  { icon: 'bolt', iconBg: 'bg-tertiary-fixed', iconColor: 'text-tertiary', value: '85%', label: 'Average Score' },
];

const SUBJECTS = [
  { id: 's1', name: 'Data Structures', teacher: 'Dr. Eleanor Vance', progress: 75 },
  { id: 's2', name: 'Macroeconomics', teacher: 'Prof. Julian Thorne', progress: 42 },
  { id: 's3', name: 'Linear Algebra', teacher: 'Dr. Sarah Chen', progress: 90 },
];

export default function StudentDashboard() {
  const navigate = useNavigate();

  return (
    <AppLayout role="student">
      {/* Welcome header */}
      <header className="flex justify-between items-center mb-xl">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-background">Welcome back</h1>
          <p className="font-body-md text-body-md text-secondary mt-1">
            Your academic progress is looking strong this week.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button className="w-10 h-10 flex items-center justify-center rounded-full bg-white ambient-shadow hover:bg-surface-container transition-colors">
            <span className="material-symbols-outlined text-on-surface-variant">notifications</span>
          </button>
          <button className="w-10 h-10 flex items-center justify-center rounded-full bg-white ambient-shadow hover:bg-surface-container transition-colors">
            <span className="material-symbols-outlined text-on-surface-variant">settings</span>
          </button>
        </div>
      </header>

      {/* CTA Banner */}
      <section className="mb-xl">
        <div className="relative overflow-hidden rounded-3xl bg-primary text-on-primary p-lg flex flex-col md:flex-row items-start justify-between ambient-shadow">
          <div className="z-10 relative">
            <h2 className="font-headline-md text-headline-md mb-2">Have a study question?</h2>
            <p className="font-body-md text-body-md text-primary-fixed mb-6 max-w-md">
              Our AI tutor is ready to help you solve complex problems, explain concepts, or prep for exams.
            </p>
            <button
              onClick={() => navigate('/student/chat')}
              className="h-12 px-8 bg-white text-primary font-label-md text-label-md rounded-full flex items-center gap-2 hover:scale-95 transition-all duration-150 shadow-lg shadow-black/10"
            >
              <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>chat_bubble</span>
              Ask ExamAI a Question
            </button>
          </div>
        </div>
      </section>

      {/* Quick Stats */}
      <section className="mb-xl">
        <SectionHeader title="Quick Stats" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
          {QUICK_STATS.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </div>
      </section>

      {/* Enrolled Subjects */}
      <section>
        <SectionHeader
          title="Enrolled Subjects"
          action={
            <button className="text-primary font-label-md text-label-md flex items-center gap-1 hover:underline">
              View All <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          }
        />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
          {SUBJECTS.map((subject) => (
            <button
              key={subject.id}
              onClick={() => navigate(`/student/subject/${subject.id}`)}
              className="bg-white rounded-2xl ambient-shadow card-hover overflow-hidden text-left group"
            >
              {/* Color banner instead of external image */}
              <div className="h-24 w-full bg-gradient-to-br from-primary-fixed to-secondary-container flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-[40px]">menu_book</span>
              </div>
              <div className="p-md">
                <h3 className="font-headline-md text-[18px] text-on-background mb-1">{subject.name}</h3>
                <p className="font-body-md text-body-md text-secondary mb-4">{subject.teacher}</p>
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[12px] font-label-md">
                    <span className="text-secondary">Progress</span>
                    <span className="text-on-background font-bold">{subject.progress}%</span>
                  </div>
                  <ProgressBar value={subject.progress} />
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>
    </AppLayout>
  );
}
