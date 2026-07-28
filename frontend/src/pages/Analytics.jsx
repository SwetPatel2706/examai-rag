import React, { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { SectionHeader } from '@/components/ui/shared';
import { cn } from '@/lib/utils';

// --- Mock data (replace with GET /analytics?quiz_id=X when backend is ready) ---
const QUIZZES_LIST = [
  { id: 'q1', title: 'Arrays & Complexity', subject: 'Data Structures' },
  { id: 'q2', title: 'Supply & Demand', subject: 'Macroeconomics' },
];

const ANALYTICS_DATA = {
  q1: {
    avgScore: 76,
    classSize: 28,
    completed: 25,
    gradeDist: [
      { label: 'A (90–100)', pct: 32, barColor: 'bg-tertiary', textColor: 'text-tertiary' },
      { label: 'B (80–89)', pct: 28, barColor: 'bg-primary', textColor: 'text-primary' },
      { label: 'C (70–79)', pct: 24, barColor: 'bg-secondary', textColor: 'text-secondary' },
      { label: 'D or Below', pct: 16, barColor: 'bg-error', textColor: 'text-error' },
    ],
    weakTopics: [
      { topic: 'QuickSort Worst Case', accuracy: 38 },
      { topic: 'Heap Operations', accuracy: 52 },
      { topic: 'Dynamic Programming', accuracy: 61 },
    ],
    // Question accuracy heatmap — each entry is a question with % correct
    questions: [
      { label: 'Q1 Array Access', accuracy: 96 },
      { label: 'Q2 LIFO/FIFO', accuracy: 88 },
      { label: 'Q3 QuickSort', accuracy: 38 },
      { label: 'Q4 BST Search', accuracy: 72 },
      { label: 'Q5 Heap Insert', accuracy: 52 },
      { label: 'Q6 Graph BFS', accuracy: 64 },
      { label: 'Q7 DP Memoize', accuracy: 44 },
      { label: 'Q8 Hash Table', accuracy: 80 },
      { label: 'Q9 Merge Sort', accuracy: 76 },
      { label: 'Q10 Space Complexity', accuracy: 68 },
    ],
  },
  q2: {
    avgScore: 81,
    classSize: 22,
    completed: 20,
    gradeDist: [
      { label: 'A (90–100)', pct: 40, barColor: 'bg-tertiary', textColor: 'text-tertiary' },
      { label: 'B (80–89)', pct: 35, barColor: 'bg-primary', textColor: 'text-primary' },
      { label: 'C (70–79)', pct: 15, barColor: 'bg-secondary', textColor: 'text-secondary' },
      { label: 'D or Below', pct: 10, barColor: 'bg-error', textColor: 'text-error' },
    ],
    weakTopics: [
      { topic: 'Monetary Policy', accuracy: 55 },
      { topic: 'Fiscal Multiplier', accuracy: 62 },
    ],
    questions: [
      { label: 'Q1 Supply Curve', accuracy: 90 },
      { label: 'Q2 Demand Elasticity', accuracy: 74 },
      { label: 'Q3 Monetary Policy', accuracy: 55 },
      { label: 'Q4 GDP Calculation', accuracy: 82 },
      { label: 'Q5 Inflation Types', accuracy: 68 },
    ],
  },
};

function accuracyColor(pct) {
  if (pct >= 80) return 'bg-tertiary text-on-tertiary-fixed';
  if (pct >= 60) return 'bg-primary text-on-primary';
  if (pct >= 40) return 'bg-secondary text-on-secondary';
  return 'bg-error text-on-error';
}

export default function Analytics() {
  const [selectedQuizId, setSelectedQuizId] = useState(QUIZZES_LIST[0].id);
  const data = ANALYTICS_DATA[selectedQuizId];
  const quiz = QUIZZES_LIST.find((q) => q.id === selectedQuizId);
  const completionPct = Math.round((data.completed / data.classSize) * 100);

  return (
    <AppLayout role="teacher">
      <header className="mb-sp-xl flex items-start justify-between">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-background">Analytics</h1>
          <p className="font-body-md text-body-md text-secondary mt-1">
            Per-quiz class-wide results breakdown.
          </p>
        </div>
        {/* Quiz selector */}
        <select
          className="border border-outline-variant rounded-xl px-sp-md py-sp-sm font-label-md text-label-md outline-none focus:border-primary bg-white"
          value={selectedQuizId}
          onChange={(e) => setSelectedQuizId(e.target.value)}
        >
          {QUIZZES_LIST.map((q) => (
            <option key={q.id} value={q.id}>{q.title} — {q.subject}</option>
          ))}
        </select>
      </header>

      {/* Top stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-sp-md mb-sp-xl">
        {[
          { icon: 'groups', label: 'Class Size', value: data.classSize, iconBg: 'bg-primary-fixed', iconColor: 'text-primary' },
          { icon: 'assignment_turned_in', label: 'Completed', value: `${data.completed}/${data.classSize}`, iconBg: 'bg-tertiary-fixed/30', iconColor: 'text-tertiary' },
          { icon: 'percent', label: 'Completion', value: `${completionPct}%`, iconBg: 'bg-secondary-container', iconColor: 'text-secondary' },
          { icon: 'leaderboard', label: 'Class Avg', value: `${data.avgScore}%`, iconBg: 'bg-primary-fixed', iconColor: 'text-primary' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white p-sp-md rounded-2xl ambient-shadow card-hover">
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-sp-sm', stat.iconBg, stat.iconColor)}>
              <span className="material-symbols-outlined">{stat.icon}</span>
            </div>
            <p className="font-label-md text-label-md text-secondary">{stat.label}</p>
            <p className="font-display-lg text-[32px] font-bold text-on-background mt-sp-xs leading-none">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-sp-lg">
        {/* Question Accuracy Heatmap */}
        <div className="lg:col-span-2">
          <SectionHeader title="Question Accuracy Heatmap" />
          <div className="bg-white rounded-2xl ambient-shadow p-sp-md">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
              {data.questions.map((q) => (
                <div
                  key={q.label}
                  className={cn('rounded-xl p-3 flex flex-col gap-1 transition-transform hover:scale-105', accuracyColor(q.accuracy))}
                >
                  <span className="text-[11px] font-bold opacity-80 uppercase tracking-wider">{q.label}</span>
                  <span className="text-[24px] font-bold leading-none">{q.accuracy}%</span>
                  <span className="text-[10px] opacity-70">correct</span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-4 mt-sp-md pt-sp-md border-t border-outline-variant">
              <span className="font-label-sm text-label-sm text-secondary">Key:</span>
              {[
                { label: '≥80% Good', color: 'bg-tertiary' },
                { label: '60–79% OK', color: 'bg-primary' },
                { label: '40–59% Weak', color: 'bg-secondary' },
                { label: '<40% Poor', color: 'bg-error' },
              ].map((k) => (
                <div key={k.label} className="flex items-center gap-1.5">
                  <span className={cn('w-3 h-3 rounded', k.color)} />
                  <span className="font-label-sm text-label-sm text-secondary">{k.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-sp-lg">
          {/* Grade Distribution */}
          <div className="bg-white rounded-2xl ambient-shadow p-sp-md">
            <SectionHeader title="Grade Distribution" />
            <div className="space-y-sp-sm">
              {data.gradeDist.map((g) => (
                <div key={g.label}>
                  <div className="flex justify-between font-label-sm text-label-sm mb-sp-xs">
                    <span className="text-on-surface-variant">{g.label}</span>
                    <span className={g.textColor}>{g.pct}%</span>
                  </div>
                  <div className="w-full h-2 bg-surface-container-high rounded-full overflow-hidden">
                    <div className={cn('h-full rounded-full', g.barColor)} style={{ width: `${g.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Weak Topics */}
          <div className="bg-white rounded-2xl ambient-shadow p-sp-md">
            <SectionHeader title="Weak Topics" />
            <div className="space-y-3">
              {data.weakTopics.map((wt) => (
                <div key={wt.topic} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-error-container flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-error text-[18px]">trending_down</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-label-md text-label-md text-on-surface truncate">{wt.topic}</p>
                    <p className="font-label-sm text-label-sm text-error">{wt.accuracy}% class accuracy</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
