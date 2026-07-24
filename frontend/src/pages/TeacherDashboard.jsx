import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

// Mock data
const SUBJECTS = ['Mathematics', 'Chemistry', 'Economics'];

const STATS = [
  {
    icon: 'groups',
    bg: 'bg-primary-fixed',
    color: 'text-primary',
    label: 'Active Students',
    value: '128',
    badge: { text: 'Sec B-12', style: 'text-on-surface-variant bg-surface-container-high' },
    accent: 'border-l-4 border-primary',
  },
  {
    icon: 'upload_file',
    bg: 'bg-secondary-container',
    color: 'text-secondary',
    label: 'Subject Materials',
    value: '24',
    badge: { text: '+3 today', style: 'text-tertiary-container bg-tertiary-fixed/30' },
    accent: '',
  },
  {
    icon: 'quiz',
    bg: 'bg-tertiary-fixed',
    color: 'text-tertiary',
    label: 'Quizzes Created',
    value: '12',
    badge: null,
    accent: '',
  },
];

const ACTIVITY = [
  { initials: 'AM', name: 'Alex Martinez', quiz: 'Advanced Calculus IV', time: '2 mins ago', score: 92, scoreStyle: 'bg-tertiary-fixed/30 text-tertiary' },
  { initials: 'KL', name: 'Kevin Lee', quiz: 'Linear Algebra Refresher', time: '1 hour ago', score: 79, scoreStyle: 'bg-tertiary-fixed/30 text-tertiary' },
  { initials: 'JR', name: 'Jordan Rivera', quiz: 'Complex Integrals', time: '42 mins ago', score: 64, scoreStyle: 'bg-error-container text-on-error-container' },
];

const GRADE_DIST = [
  { label: 'A (90-100)', pct: 45, barColor: 'bg-primary', textColor: 'text-primary' },
  { label: 'B (80-89)', pct: 30, barColor: 'bg-tertiary', textColor: 'text-tertiary' },
  { label: 'C or Below', pct: 25, barColor: 'bg-secondary', textColor: 'text-secondary' },
];

const SIDEBAR_NAV = [
  { icon: 'dashboard', label: 'Dashboard', active: true },
  { icon: 'assignment', label: 'Assignments' },
  { icon: 'database', label: 'Question Bank' },
  { icon: 'bar_chart', label: 'Analytics' },
  { icon: 'groups', label: 'Student Progress' },
];

const AI_INSIGHTS_BG =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDSOVFsHGrWhg7eMrWcIuY0I6EsrmxByEhUiXL3NbWVMaRPIvK_M4-xTn2Fjqyf1n_M3De_p9SsNI5qOCfMB2AKOfzM9LhNRT9vHHy3t4c7yxGXXRNPr1oYB0XCO38pr9vmjqqMUn4TY_pNHHn6CLglcQMffmUSt3x2uC7aoZ5Aoi9ALglLN__CivtGg_gxkND5GNl7-4GSV_0KfkHlt6I_jYGOUZ-Xs-3_QtAjoZC16R70qWSNDca5mEZv5UBoeplQvx5I9NMSV90';

const PROFESSOR_AVATAR =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAKjYFk5PnvLQtTCIX0PqsgRmUS2L9uSoZpK-iXC80IetU_R_EucSq4h-yBRKoXwQiVylhctFH0UbJV9EIxTOp42-lxhXlszflfl2Ec1sZQkO5G8ZG3cnqMuGsXR_S2l4dvLchGU7VRM0V6DKjfWNOn8YEf8leSFEvq4E66Jtmj8fTL5JkeM9pl6vaXPtaP6wsll9g2TD95ppMc3VHA0tUadtIaf62Nx-k2xI3ChVdQKd55gtCirHkX7mULdVvns-W0WUtvR4Tk1m8';

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const [activeSubject, setActiveSubject] = useState('Mathematics');

  return (
    <div className="bg-background text-on-surface" style={{ fontFamily: "'Geist Variable', sans-serif" }}>

      {/* ─── Sidebar ─── */}
      <aside className="h-screen w-64 fixed left-0 top-0 bg-surface-container-lowest shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)] z-50 flex flex-col py-lg px-sm">
        {/* Logo */}
        <div className="mb-lg px-xs">
          <h1 className="font-headline-md text-headline-md font-bold text-primary">AI Exam Prep</h1>
          <p className="text-on-surface-variant font-label-sm text-label-sm uppercase tracking-wider opacity-70 mt-0.5">
            Professor View
          </p>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1">
          {SIDEBAR_NAV.map((item) => (
            <a
              key={item.label}
              href="#"
              className={`flex items-center gap-sm px-md py-sm rounded-xl transition-all duration-150 active:scale-[0.98] ${
                item.active
                  ? 'text-primary font-bold border-r-4 border-primary bg-primary-fixed/30'
                  : 'text-on-surface-variant hover:text-primary hover:bg-surface-container-low'
              }`}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              <span className="font-label-md text-label-md">{item.label}</span>
            </a>
          ))}
        </nav>

        {/* Bottom actions */}
        <div className="mt-auto space-y-1">
          <button className="w-full mb-md bg-primary text-on-primary py-sm rounded-xl font-label-md text-label-md flex items-center justify-center gap-xs shadow-md transition-transform active:scale-95 hover:bg-primary-container">
            <span className="material-symbols-outlined">add</span>
            Create New Exam
          </button>
          <a href="#" className="flex items-center gap-sm px-md py-sm rounded-xl text-on-surface-variant hover:text-primary hover:bg-surface-container-low transition-colors duration-200">
            <span className="material-symbols-outlined">settings</span>
            <span className="font-label-md text-label-md">Settings</span>
          </a>
          <button
            onClick={() => navigate('/login')}
            className="flex items-center gap-sm px-md py-sm rounded-xl text-on-surface-variant hover:text-primary hover:bg-surface-container-low transition-colors duration-200 w-full text-left"
          >
            <span className="material-symbols-outlined">help</span>
            <span className="font-label-md text-label-md">Support</span>
          </button>
        </div>
      </aside>

      {/* ─── Top App Bar ─── */}
      <header className="fixed top-0 right-0 h-16 bg-surface/80 backdrop-blur-md border-b border-outline-variant z-40 flex items-center justify-between px-md"
        style={{ left: '16rem', width: 'calc(100% - 16rem)' }}>
        {/* Search */}
        <div className="flex items-center gap-md flex-1">
          <div className="relative w-full max-w-md">
            <span className="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-outline text-[20px]">
              search
            </span>
            <input
              className="w-full bg-surface-container-low border-none rounded-full pl-xl pr-md py-xs font-label-md text-label-md focus:ring-2 focus:ring-primary/20 outline-none"
              placeholder="Search resources, students..."
              type="text"
            />
          </div>
        </div>
        {/* Actions */}
        <div className="flex items-center gap-sm">
          <button className="bg-primary-fixed text-primary font-label-md text-label-md px-md py-xs rounded-full hover:bg-primary-container hover:text-on-primary transition-colors">
            New Module
          </button>
          <div className="flex items-center gap-xs">
            <button className="p-xs text-on-surface-variant hover:bg-surface-container-high rounded-full transition-opacity active:opacity-80">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <div className="h-8 w-8 rounded-full bg-surface-variant overflow-hidden flex items-center justify-center">
              <img alt="Professor" className="w-full h-full object-cover" src={PROFESSOR_AVATAR} />
            </div>
          </div>
        </div>
      </header>

      {/* ─── Main Content ─── */}
      <main className="ml-64 pt-16 min-h-screen p-md lg:p-lg">

        {/* Dashboard Header + Subject Tabs */}
        <section className="mb-lg">
          <div className="flex flex-col gap-md">
            <div className="flex items-end justify-between">
              <div>
                <p className="font-label-md text-label-md text-primary font-bold mb-xs">Welcome back, Professor</p>
                <h2 className="font-headline-lg text-headline-lg text-on-surface">Dashboard Overview</h2>
              </div>
              <div className="flex items-center gap-sm text-on-surface-variant font-label-md text-label-md">
                <span className="material-symbols-outlined text-sm">calendar_today</span>
                October 24, 2023
              </div>
            </div>

            {/* Subject Tabs */}
            <div className="flex items-center gap-xs border-b border-surface-container-high pb-0">
              {SUBJECTS.map((subj) => (
                <button
                  key={subj}
                  onClick={() => setActiveSubject(subj)}
                  className={`px-md py-sm rounded-t-xl font-label-md text-label-md transition-all ${
                    activeSubject === subj
                      ? 'text-primary bg-primary-fixed/30 border-b-4 border-primary -mb-px'
                      : 'text-on-surface-variant hover:bg-surface-container-low'
                  }`}
                >
                  {subj}
                </button>
              ))}
              <button className="ml-auto p-xs text-outline hover:text-primary transition-colors">
                <span className="material-symbols-outlined">add_circle</span>
              </button>
            </div>
          </div>
        </section>

        {/* Stats Bento Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-md mb-lg">
          {STATS.map((stat) => (
            <div
              key={stat.label}
              className={`bg-surface-container-lowest p-md rounded-2xl shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)] hover:-translate-y-1 transition-all duration-300 ${stat.accent}`}
            >
              <div className="flex items-center justify-between mb-sm">
                <div className={`h-10 w-10 ${stat.bg} ${stat.color} rounded-xl flex items-center justify-center`}>
                  <span className="material-symbols-outlined">{stat.icon}</span>
                </div>
                {stat.badge && (
                  <span className={`text-label-sm font-bold px-xs py-1 rounded-full ${stat.badge.style}`}>
                    {stat.badge.text}
                  </span>
                )}
              </div>
              <p className="font-label-md text-label-md text-on-surface-variant">{stat.label}</p>
              <h3 className="font-display-lg text-display-lg text-on-surface mt-xs leading-none">{stat.value}</h3>
            </div>
          ))}

          {/* Avg Score — filled primary card */}
          <div className="bg-primary text-on-primary p-md rounded-2xl shadow-[0_4px_20px_-2px_rgba(15,23,42,0.10)] hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
            <div className="relative z-10">
              <p className="font-label-md text-label-md opacity-80">Avg. Section Score</p>
              <h3 className="font-display-lg text-display-lg mt-xs leading-none">84%</h3>
              <div className="mt-md flex items-center gap-xs">
                <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>
                  trending_up
                </span>
                <span className="text-label-sm font-label-sm">Top 5% in department</span>
              </div>
            </div>
            <div className="absolute -right-4 -bottom-4 opacity-20">
              <span className="material-symbols-outlined text-[100px]">functions</span>
            </div>
          </div>
        </section>

        {/* Dynamic Content */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-lg">

          {/* Activity Table — 2/3 */}
          <div className="lg:col-span-2 space-y-md">
            <div className="flex items-center justify-between">
              <h3 className="font-headline-md text-headline-md text-on-surface">
                Recent Student Activity{' '}
                <span className="text-on-surface-variant font-normal text-body-md">({activeSubject})</span>
              </h3>
              <button className="text-primary font-label-md text-label-md hover:underline">Full Analytics</button>
            </div>
            <div className="bg-surface-container-lowest rounded-2xl shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-surface-container-high bg-surface-container-low/50">
                      {['STUDENT', 'QUIZ MODULE', 'COMPLETION', 'SCORE', 'ACTION'].map((col) => (
                        <th
                          key={col}
                          className={`px-md py-sm font-label-sm text-label-sm text-on-surface-variant ${col === 'ACTION' ? 'text-right' : ''}`}
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-container-high">
                    {ACTIVITY.map((row) => (
                      <tr key={row.name} className="hover:bg-surface-container-low transition-colors group">
                        <td className="px-md py-md">
                          <div className="flex items-center gap-sm">
                            <div className="h-8 w-8 rounded-full bg-primary-fixed/50 flex items-center justify-center font-bold text-primary text-xs flex-shrink-0">
                              {row.initials}
                            </div>
                            <span className="font-label-md text-label-md text-on-surface">{row.name}</span>
                          </div>
                        </td>
                        <td className="px-md py-md font-body-md text-body-md text-on-surface-variant">{row.quiz}</td>
                        <td className="px-md py-md font-body-md text-body-md text-on-surface-variant">{row.time}</td>
                        <td className="px-md py-md">
                          <span className={`px-xs py-1 rounded-full font-bold text-[13px] ${row.scoreStyle}`}>
                            {row.score}/100
                          </span>
                        </td>
                        <td className="px-md py-md text-right">
                          <button className="p-xs text-outline hover:text-primary transition-colors opacity-0 group-hover:opacity-100">
                            <span className="material-symbols-outlined">visibility</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Side cards — 1/3 */}
          <div className="space-y-lg">
            {/* Grade Distribution */}
            <div className="bg-surface-container-lowest p-md rounded-2xl shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)]">
              <h3 className="font-label-md text-label-md font-bold mb-md">Grade Distribution</h3>
              <div className="space-y-sm">
                {GRADE_DIST.map((g) => (
                  <div key={g.label}>
                    <div className="flex justify-between text-label-sm font-label-sm mb-xs">
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

            {/* AI Insights Card */}
            <div className="rounded-2xl overflow-hidden relative h-48 group">
              <div
                className="absolute inset-0 z-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                style={{ backgroundImage: `url('${AI_INSIGHTS_BG}')` }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/90 to-transparent z-10" />
              <div className="absolute bottom-0 left-0 p-md z-20 text-on-primary">
                <p className="font-label-sm text-label-sm uppercase tracking-wider mb-xs opacity-80">AI Insights</p>
                <h4 className="font-headline-md text-headline-md leading-tight mb-sm">Predictive Performance</h4>
                <button className="bg-white/20 backdrop-blur-md px-md py-xs rounded-full text-label-sm font-bold border border-white/30 hover:bg-white/40 transition-colors">
                  Explore Insights
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
