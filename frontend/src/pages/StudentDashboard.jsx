import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

// Static mock data
const STUDENT = {
  name: 'Alex Rivers',
  role: 'Junior • Computer Science',
  avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCbvchZsrjyikbvlcUQkIfGnn8o-xooVKF85JT-AEjmdDm8h2H_o0HLubiLNZa5qHX1BOn6fbA7Z_24QuArACpLyBXMS6NZzZL4l11A7lIE29diMac7Gxw0T4_r3RLqzf0Ajt8dzXoHx6vHdWIOsjgP34DeBPXJI4N5D0LyH1BNuRWgFUVMOVFxwHUqYxSfWyiYCu9QPa6n_h0vmevCxeP_N5n1WeLckwYUcS9TIiDbGEu__6tUFtOV6k2TR2EMVRLAhTsb1jIuhK4',
};

const QUICK_STATS = [
  { icon: 'assignment', bg: 'bg-primary-fixed', color: 'text-primary', value: '12', label: 'Quizzes Taken' },
  { icon: 'trending_down', bg: 'bg-error-container', color: 'text-error', value: '4', label: 'Weak Topics' },
  { icon: 'bolt', bg: 'bg-tertiary-fixed', color: 'text-tertiary', value: '85%', label: 'Average Score' },
];

const SUBJECTS = [
  {
    name: 'Data Structures',
    teacher: 'Dr. Eleanor Vance',
    progress: 75,
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDFJP8KtXRM5bFWYr_pINREzhxF8hbk8TizVYfJnwui7x3l-Bg7EV5nLmKktkE0Lb2dM904ivv7WUp4We6iojW7gBqLW-9g6k2xypGogyO5GKIu0aNpCS0_zUY7itlyAzUI3zKB-QO0ObnTlHEcVRELjnCrqQFPPdhCAgToD9sFhk3HWij1psyg1u-1wxenqvs-QthU8pL_zBAYM-0J4SExOt_dJnv3n_BjbsQ_uRzxbP106fNQgQd_uGWth-k36PEc4I9j3vnISps',
  },
  {
    name: 'Macroeconomics',
    teacher: 'Prof. Julian Thorne',
    progress: 42,
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDJKLjj7vZ3ia3TmTDpO4M8l5pQmM0HswqfH_7gmRradyeZcDEAOAleoJaRk4lkSOZBp1mryeb56-bdlgEqTf3A21-TH_mUOXUPn9K-9Qo-Jx1Ifzna1ytqwet6GdeCyXFHf-0qQoB7FCJgr3GwRNRXggeSH2ZhUQG7uWk18Id9lcRvXE4zDPBdjYMAjBTBKzkgOyJhSrK8YBWG9wxW3k9G34waeMDJ8rTrg58g-41eM3JXi8_3f2qAWmUKbGIMAW5UA_xx9SlOUQM',
  },
  {
    name: 'Linear Algebra',
    teacher: 'Dr. Sarah Chen',
    progress: 90,
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBdRitKTvjTv6OktEREPZZNzbTl5xZCPdV8xNeGzw-wRuDKYQa_IOZr-ywBXSb4IbEOf6mwDYFg4FRrcMrwIh2sfIRdCUchVlzsSxV0QtskrlOhmPnM_r6PoHSZOvUcqLws8w1igO-KTWWFvpPk8xCL7Tc3wOE2gaph5DOvkVkJ7Mk1vJ-1_6EcR0DD1gN9SmSjTp1z_Rju0201DMxtjQ5xB2Sal8ARzViBFQGjK3Xnbf_gSOJ8OHNzyQu-ywTHS8S5xLJkqyvV05U',
  },
];

const NAV_ITEMS = [
  { icon: 'home', label: 'Home', active: true },
  { icon: 'chat_bubble', label: 'Chat' },
  { icon: 'quiz', label: 'Quizzes' },
  { icon: 'menu_book', label: 'Resources' },
];

export default function StudentDashboard() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen bg-surface text-on-surface" style={{ fontFamily: "'Geist Variable', sans-serif" }}>

      {/* ─── Sidebar ─── */}
      <aside className="h-screen w-64 fixed left-0 top-0 bg-white flex flex-col border-r border-outline-variant z-50">
        {/* Logo */}
        <div className="p-6">
          <span className="font-headline-md text-headline-md font-bold text-primary">ExamAI</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 mt-1">
          <div className="space-y-1">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.label}
                href="#"
                className={`flex items-center gap-3 px-4 py-3 mx-2 rounded-xl transition-all duration-200 ${
                  item.active
                    ? 'bg-secondary-container text-on-secondary-container translate-x-1'
                    : 'text-secondary hover:bg-surface-container-low'
                }`}
              >
                <span className="material-symbols-outlined">{item.icon}</span>
                <span className="font-label-md text-label-md">{item.label}</span>
              </a>
            ))}
          </div>
        </nav>

        {/* User profile + logout */}
        <div className="p-4 border-t border-outline-variant">
          <div className="flex items-center gap-3 px-2 py-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-primary-fixed flex items-center justify-center overflow-hidden flex-shrink-0">
              <img className="w-full h-full object-cover" src={STUDENT.avatar} alt={STUDENT.name} />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-label-md text-label-md font-bold text-on-surface truncate">{STUDENT.name}</span>
              <span className="text-[12px] text-secondary opacity-80 truncate">{STUDENT.role}</span>
            </div>
          </div>
          <div className="space-y-1">
            <a href="#" className="flex items-center gap-3 text-secondary px-4 py-2 mx-2 hover:bg-surface-container-low transition-all rounded-lg">
              <span className="material-symbols-outlined text-[20px]">person</span>
              <span className="font-label-md text-label-md">Profile</span>
            </a>
            <button
              onClick={() => navigate('/login')}
              className="flex items-center gap-3 text-error px-4 py-2 mx-2 hover:bg-error-container transition-all rounded-lg w-full text-left"
            >
              <span className="material-symbols-outlined text-[20px]">logout</span>
              <span className="font-label-md text-label-md">Log Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ─── Main Content ─── */}
      <main className="flex-1 ml-64 p-margin-desktop bg-surface min-h-screen">

        {/* Welcome header */}
        <header className="flex justify-between items-center mb-xl">
          <div>
            <h1 className="font-headline-lg text-headline-lg text-on-background">Welcome back, Alex</h1>
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
                Our AI tutor is ready to help you solve complex problems, explain concepts, or prep for exams in seconds.
              </p>
              <button className="h-12 px-8 bg-white text-primary font-label-md text-label-md rounded-full flex items-center gap-2 hover:scale-95 transition-all duration-150 shadow-lg shadow-black/10">
                <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>chat_bubble</span>
                Ask ExamAI a Question
              </button>
            </div>
            {/* Decorative overlay */}
            <div className="absolute right-0 top-0 w-1/3 h-full opacity-20 pointer-events-none" />
          </div>
        </section>

        {/* Quick Stats */}
        <section className="mb-xl">
          <div className="flex items-center justify-between mb-sm">
            <h2 className="font-label-md text-label-md font-bold uppercase tracking-wider text-secondary">
              Quick Stats
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
            {QUICK_STATS.map((stat) => (
              <div key={stat.label} className="bg-white p-md rounded-2xl ambient-shadow card-hover flex flex-col gap-xs">
                <div className={`w-10 h-10 rounded-xl ${stat.bg} ${stat.color} flex items-center justify-center mb-2`}>
                  <span className="material-symbols-outlined">{stat.icon}</span>
                </div>
                <span className="font-display-lg text-display-lg text-on-background">{stat.value}</span>
                <span className="font-label-md text-label-md text-secondary">{stat.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Enrolled Subjects */}
        <section>
          <div className="flex items-center justify-between mb-sm">
            <h2 className="font-label-md text-label-md font-bold uppercase tracking-wider text-secondary">
              Enrolled Subjects
            </h2>
            <button className="text-primary font-label-md text-label-md flex items-center gap-1 hover:underline">
              View All
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
            {SUBJECTS.map((subject) => (
              <div key={subject.name} className="bg-white rounded-2xl ambient-shadow card-hover overflow-hidden group">
                <div className="h-32 w-full relative">
                  <img
                    className="w-full h-full object-cover"
                    src={subject.img}
                    alt={subject.name}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                </div>
                <div className="p-md">
                  <h3 className="font-headline-md text-[20px] text-on-background mb-1">{subject.name}</h3>
                  <p className="font-body-md text-body-md text-secondary mb-4">{subject.teacher}</p>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-[12px] font-label-md">
                      <span className="text-secondary">Progress</span>
                      <span className="text-on-background font-bold">{subject.progress}%</span>
                    </div>
                    <div className="w-full bg-surface-container h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-primary h-full rounded-full"
                        style={{ width: `${subject.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
