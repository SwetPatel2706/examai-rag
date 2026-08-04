import React, { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { SectionHeader } from '@/components/ui/shared';
import { cn } from '@/lib/utils';

// --- Mock data (replace with GET /students?subject=X when backend is ready) ---
const SUBJECTS_LIST = ['All Subjects', 'Data Structures', 'Macroeconomics', 'Linear Algebra'];

const STUDENTS = [
  {
    id: 'st1',
    name: 'Alex Martinez',
    initials: 'AM',
    avgScore: 88,
    completion: 92,
    lastActive: '2026-07-23',
    atRisk: false,
    subjects: ['Data Structures', 'Linear Algebra'],
    quizHistory: [
      { quizTitle: 'Arrays & Complexity', score: 92, date: '2026-07-20' },
      { quizTitle: 'Graph Algorithms', score: 84, date: '2026-07-22' },
    ],
  },
  {
    id: 'st2',
    name: 'Jordan Rivera',
    initials: 'JR',
    avgScore: 58,
    completion: 65,
    lastActive: '2026-07-21',
    atRisk: true,
    subjects: ['Data Structures'],
    quizHistory: [
      { quizTitle: 'Arrays & Complexity', score: 64, date: '2026-07-20' },
      { quizTitle: 'Linked Lists', score: 52, date: '2026-07-21' },
    ],
  },
  {
    id: 'st3',
    name: 'Kevin Lee',
    initials: 'KL',
    avgScore: 74,
    completion: 80,
    lastActive: '2026-07-23',
    atRisk: false,
    subjects: ['Macroeconomics'],
    quizHistory: [
      { quizTitle: 'Supply & Demand', score: 79, date: '2026-07-22' },
    ],
  },
  {
    id: 'st4',
    name: 'Priya Mehta',
    initials: 'PM',
    avgScore: 45,
    completion: 40,
    lastActive: '2026-07-18',
    atRisk: true,
    subjects: ['Data Structures', 'Macroeconomics'],
    quizHistory: [
      { quizTitle: 'Arrays & Complexity', score: 48, date: '2026-07-18' },
    ],
  },
];

function ScoreBadge({ score }) {
  const style =
    score >= 80 ? 'bg-tertiary-fixed/30 text-tertiary' :
    score >= 60 ? 'bg-primary-fixed text-primary' :
    'bg-error-container text-error';
  return <span className={cn('px-2 py-0.5 rounded-full text-[13px] font-bold', style)}>{score}%</span>;
}

export default function StudentProgress() {
  const [subjectFilter, setSubjectFilter] = useState('All Subjects');
  const [search, setSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);

  const filtered = STUDENTS.filter((s) => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase());
    const matchSubject = subjectFilter === 'All Subjects' || s.subjects?.includes(subjectFilter);
    return matchSearch && matchSubject;
  });

  const atRiskCount = filtered.filter((s) => s.atRisk).length;

  return (
    <AppLayout role="teacher">
      <header className="mb-sp-xl">
        <h1 className="font-headline-lg text-headline-lg text-on-background">Student Progress</h1>
        <p className="font-body-md text-body-md text-secondary mt-1">
          Roster-style cross-quiz progress. At-risk students are flagged automatically.
        </p>
      </header>

      {/* Filters */}
      <div className="flex items-center gap-sp-md mb-sp-lg flex-wrap">
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary text-[18px]">search</span>
          <input
            type="text"
            className="pl-10 pr-4 h-10 border border-outline-variant rounded-xl font-label-md text-label-md outline-none focus:border-primary bg-white transition-colors"
            placeholder="Search students…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="h-10 px-sp-md border border-outline-variant rounded-xl font-label-md text-label-md outline-none focus:border-primary bg-white"
          value={subjectFilter}
          onChange={(e) => setSubjectFilter(e.target.value)}
        >
          {SUBJECTS_LIST.map((s) => <option key={s}>{s}</option>)}
        </select>

        {/* At-risk summary chip */}
        <div className="ml-auto flex items-center gap-2 bg-error-container px-3 py-2 rounded-xl">
          <span className="material-symbols-outlined text-error text-[18px]">warning</span>
          <span className="font-label-md text-label-md text-error font-bold">
            {atRiskCount} at-risk
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-sp-lg">
        {/* Roster table */}
        <div className={cn('bg-white rounded-2xl ambient-shadow overflow-hidden', selectedStudent ? 'lg:col-span-2' : 'lg:col-span-3')}>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-surface-container-high bg-surface-container-low/50">
                {['Student', 'Avg Score', 'Completion', 'Last Active', 'Status', ''].map((col) => (
                  <th key={col} className="px-sp-md py-sp-sm font-label-sm text-label-sm text-on-surface-variant">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-high">
              {filtered.map((s) => {
                const toggleStudent = () =>
                  setSelectedStudent(selectedStudent?.id === s.id ? null : s);

                return (
                <tr
                  key={s.id}
                  tabIndex={0}
                  aria-expanded={selectedStudent?.id === s.id}
                  onClick={toggleStudent}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      toggleStudent();
                    }
                  }}
                  className={cn(
                    'hover:bg-surface-container-low cursor-pointer transition-colors group focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary/50',
                    selectedStudent?.id === s.id && 'bg-primary-fixed/10'
                  )}
                >
                  <td className="px-sp-md py-sp-md">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0',
                        s.atRisk ? 'bg-error-container text-error' : 'bg-primary-fixed text-primary'
                      )}>
                        {s.initials}
                      </div>
                      <span className="font-label-md text-label-md text-on-surface">{s.name}</span>
                    </div>
                  </td>
                  <td className="px-sp-md py-sp-md"><ScoreBadge score={s.avgScore} /></td>
                  <td className="px-sp-md py-sp-md">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                        <div className="bg-primary h-full rounded-full" style={{ width: `${s.completion}%` }} />
                      </div>
                      <span className="font-label-sm text-label-sm text-secondary">{s.completion}%</span>
                    </div>
                  </td>
                  <td className="px-sp-md py-sp-md font-label-sm text-label-sm text-secondary">{s.lastActive}</td>
                  <td className="px-sp-md py-sp-md">
                    {s.atRisk ? (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-error-container text-error text-[11px] font-bold w-fit">
                        <span className="material-symbols-outlined text-[14px]">warning</span>
                        At Risk
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-tertiary-fixed/20 text-tertiary text-[11px] font-bold">On Track</span>
                    )}
                  </td>
                  <td className="px-sp-md py-sp-md text-right">
                    <span className="material-symbols-outlined text-outline group-hover:text-primary transition-colors text-[18px]">
                      {selectedStudent?.id === s.id ? 'expand_less' : 'chevron_right'}
                    </span>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Drill-down panel */}
        {selectedStudent && (
          <div className="bg-white rounded-2xl ambient-shadow p-sp-md h-fit">
            <div className="flex items-center justify-between mb-sp-md">
              <h3 className="font-headline-md text-headline-md text-on-background">{selectedStudent.name}</h3>
              <button
                onClick={() => setSelectedStudent(null)}
                className="p-sp-xs rounded-lg hover:bg-surface-container-low text-secondary transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-sp-sm mb-sp-md">
              {[
                { label: 'Avg Score', value: `${selectedStudent.avgScore}%`, color: selectedStudent.avgScore >= 70 ? 'text-tertiary' : 'text-error' },
                { label: 'Completion', value: `${selectedStudent.completion}%`, color: 'text-primary' },
              ].map((stat) => (
                <div key={stat.label} className="bg-surface-container-low rounded-xl p-3 text-center">
                  <p className={cn('font-display-lg text-[28px] font-bold leading-none', stat.color)}>{stat.value}</p>
                  <p className="font-label-sm text-label-sm text-secondary mt-1">{stat.label}</p>
                </div>
              ))}
            </div>

            <SectionHeader title="Quiz History" />
            <div className="space-y-2">
              {selectedStudent.quizHistory.map((qh) => (
                <div key={qh.quizTitle} className="flex items-center justify-between p-3 bg-surface-container-low rounded-xl">
                  <div>
                    <p className="font-label-md text-label-md text-on-surface">{qh.quizTitle}</p>
                    <p className="font-label-sm text-label-sm text-secondary">{qh.date}</p>
                  </div>
                  <ScoreBadge score={qh.score} />
                </div>
              ))}
            </div>

            {/* No messaging — out of scope per agents.md */}
            {selectedStudent.atRisk && (
              <div className="mt-sp-md p-3 bg-error-container rounded-xl">
                <div className="flex items-center gap-2 mb-1">
                  <span className="material-symbols-outlined text-error text-[18px]">warning</span>
                  <span className="font-label-md text-label-md text-error font-bold">At Risk</span>
                </div>
                <p className="font-label-sm text-label-sm text-on-error-container">
                  This student's average is below 60% or completion is under 50%. Consider reaching out through your institution's channels.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
