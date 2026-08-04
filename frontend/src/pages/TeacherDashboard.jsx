import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { SectionHeader } from '@/components/ui/shared';

// --- Mock data (replace with API calls when backend is ready) ---
const SUBJECTS = ['Mathematics', 'Chemistry', 'Economics'];

const STATS = [
  { icon: 'groups', iconBg: 'bg-primary-fixed', iconColor: 'text-primary', label: 'Active Students', value: '128' },
  { icon: 'upload_file', iconBg: 'bg-secondary-container', iconColor: 'text-secondary', label: 'Subject Materials', value: '24' },
  { icon: 'quiz', iconBg: 'bg-tertiary-fixed', iconColor: 'text-tertiary', label: 'Quizzes Created', value: '12' },
];

const ACTIVITY = [
  { initials: 'AM', name: 'Alex Martinez', quiz: 'Advanced Calculus IV', time: '2 mins ago', score: 92, atRisk: false },
  { initials: 'KL', name: 'Kevin Lee', quiz: 'Linear Algebra Refresher', time: '1 hour ago', score: 79, atRisk: false },
  { initials: 'JR', name: 'Jordan Rivera', quiz: 'Complex Integrals', time: '42 mins ago', score: 64, atRisk: true },
];

const GRADE_DIST = [
  { label: 'A (90–100)', pct: 45, barColor: 'bg-primary', textColor: 'text-primary' },
  { label: 'B (80–89)', pct: 30, barColor: 'bg-tertiary', textColor: 'text-tertiary' },
  { label: 'C or Below', pct: 25, barColor: 'bg-secondary', textColor: 'text-secondary' },
];

function ScoreBadge({ score, atRisk }) {
  return (
    <span className={`px-2 py-1 rounded-full font-bold text-[13px] ${atRisk ? 'bg-error-container text-on-error-container' : 'bg-tertiary-fixed/30 text-tertiary'}`}>
      {score}/100
    </span>
  );
}

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const [activeSubject, setActiveSubject] = useState(SUBJECTS[0]);

  return (
    <AppLayout role="teacher">
      {/* Dashboard Header + Subject Tabs */}
      <section className="mb-sp-lg">
        <div className="flex items-end justify-between mb-sp-md">
          <div>
            <p className="font-label-md text-label-md text-primary font-bold mb-sp-xs">Welcome back, Professor</p>
            <h1 className="font-headline-lg text-headline-lg text-on-surface">Dashboard Overview</h1>
          </div>
          <button
            onClick={() => navigate('/teacher/quiz/create')}
            className="h-10 px-6 bg-primary text-on-primary font-label-md text-label-md rounded-full flex items-center gap-2 hover:scale-95 transition-all duration-150 shadow-md"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Create Quiz
          </button>
        </div>

        {/* Subject Tabs */}
        <div className="flex items-center gap-sp-xs border-b border-surface-container-high">
          {SUBJECTS.map((subj) => (
            <button
              key={subj}
              onClick={() => setActiveSubject(subj)}
              className={`px-sp-md py-sp-sm rounded-t-xl font-label-md text-label-md transition-all ${
                activeSubject === subj
                  ? 'text-primary bg-primary-fixed/30 border-b-4 border-primary -mb-px'
                  : 'text-on-surface-variant hover:bg-surface-container-low'
              }`}
            >
              {subj}
            </button>
          ))}
        </div>
      </section>

      {/* Stats Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-sp-md mb-sp-lg">
        {STATS.map((stat) => (
          <div key={stat.label} className="bg-white p-sp-md rounded-2xl ambient-shadow card-hover">
            <div className={`h-10 w-10 ${stat.iconBg} ${stat.iconColor} rounded-xl flex items-center justify-center mb-sp-sm`}>
              <span className="material-symbols-outlined">{stat.icon}</span>
            </div>
            <p className="font-label-md text-label-md text-on-surface-variant">{stat.label}</p>
            <h3 className="font-display-lg text-display-lg text-on-surface mt-sp-xs leading-none">{stat.value}</h3>
          </div>
        ))}

        {/* Avg Score card */}
        <div className="bg-primary text-on-primary p-sp-md rounded-2xl ambient-shadow card-hover relative overflow-hidden">
          <p className="font-label-md text-label-md opacity-80">Avg. Section Score</p>
          <h3 className="font-display-lg text-display-lg mt-sp-xs leading-none">84%</h3>
          <div className="mt-sp-md flex items-center gap-sp-xs">
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>trending_up</span>
            <span className="text-label-sm font-label-sm">Top 5% in department</span>
          </div>
          <div className="absolute -right-4 -bottom-4 opacity-20">
            <span className="material-symbols-outlined text-[100px]">functions</span>
          </div>
        </div>
      </section>

      {/* Activity + Side cards */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-sp-lg">
        {/* Activity Table — 2/3 */}
        <div className="lg:col-span-2">
          <SectionHeader
            title={`Recent Activity (${activeSubject})`}
            action={
              <button
                onClick={() => navigate('/teacher/analytics')}
                className="text-primary font-label-md text-label-md hover:underline"
              >
                Full Analytics
              </button>
            }
          />
          <div className="bg-white rounded-2xl ambient-shadow overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-surface-container-high bg-surface-container-low/50">
                  {['Student', 'Quiz', 'Completed', 'Score', ''].map((col) => (
                    <th key={col} className="px-sp-md py-sp-sm font-label-sm text-label-sm text-on-surface-variant">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-high">
                {ACTIVITY.map((row) => (
                  <tr key={row.name} className="hover:bg-surface-container-low transition-colors group">
                    <td className="px-sp-md py-sp-md">
                      <div className="flex items-center gap-sp-sm">
                        <div className="h-8 w-8 rounded-full bg-primary-fixed/50 flex items-center justify-center font-bold text-primary text-xs flex-shrink-0">
                          {row.initials}
                        </div>
                        <span className="font-label-md text-label-md text-on-surface">{row.name}</span>
                      </div>
                    </td>
                    <td className="px-sp-md py-sp-md font-body-md text-body-md text-on-surface-variant">{row.quiz}</td>
                    <td className="px-sp-md py-sp-md font-body-md text-body-md text-on-surface-variant">{row.time}</td>
                    <td className="px-sp-md py-sp-md"><ScoreBadge score={row.score} atRisk={row.atRisk} /></td>
                    <td className="px-sp-md py-sp-md text-right">
                      <button
                        onClick={() => navigate('/teacher/students')}
                        title="View student progress"
                        aria-label="View student progress"
                        className="p-sp-xs text-outline hover:text-primary transition-colors opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100"
                      >
                        <span className="material-symbols-outlined" aria-hidden="true">visibility</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Side Cards — 1/3 */}
        <div className="space-y-sp-lg">
          {/* Grade Distribution */}
          <div className="bg-white p-sp-md rounded-2xl ambient-shadow">
            <h3 className="font-label-md text-label-md font-bold mb-sp-md">Grade Distribution</h3>
            <div className="space-y-sp-sm">
              {GRADE_DIST.map((g) => (
                <div key={g.label}>
                  <div className="flex justify-between text-label-sm font-label-sm mb-sp-xs">
                    <span className="text-on-surface-variant">{g.label}</span>
                    <span className={g.textColor}>{g.pct}%</span>
                  </div>
                  <div className="w-full h-2 bg-surface-container-high rounded-full overflow-hidden">
                    <div className={`${g.barColor} h-full rounded-full`} style={{ width: `${g.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Insights CTA */}
          <div
            className="rounded-2xl overflow-hidden p-sp-md h-48 flex flex-col justify-end relative"
            style={{ background: 'linear-gradient(135deg, #3525cd 0%, #005338 100%)' }}
          >
            <p className="font-label-sm text-label-sm uppercase tracking-wider mb-sp-xs opacity-80 text-on-primary">AI Insights</p>
            <h4 className="font-headline-md text-headline-md leading-tight mb-sp-sm text-on-primary">Predictive Performance</h4>
            <button
              onClick={() => navigate('/teacher/analytics')}
              className="bg-white/20 backdrop-blur-md px-sp-md py-sp-xs rounded-full text-label-sm font-bold border border-white/30 hover:bg-white/40 transition-colors text-on-primary w-fit"
            >
              Explore Insights
            </button>
          </div>
        </div>
      </section>
    </AppLayout>
  );
}
