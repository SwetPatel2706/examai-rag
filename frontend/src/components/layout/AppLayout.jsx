import React, { useRef, useState } from 'react';
import Sidebar from './Sidebar';

const STUDENT_NAV = [
  { icon: 'home', label: 'Home', to: '/student' },
  { icon: 'chat_bubble', label: 'Chat', to: '/student/chat' },
  { icon: 'quiz', label: 'Quizzes', to: '/student/quizzes' },
  { icon: 'style', label: 'Flashcards', to: '/student/flashcards' },
  { icon: 'library_books', label: 'Resources', to: '/student/materials' },
];

const TEACHER_NAV = [
  { icon: 'dashboard', label: 'Dashboard', to: '/teacher' },
  { icon: 'upload_file', label: 'Materials', to: '/teacher/materials' },
  { icon: 'quiz', label: 'Quizzes', to: '/teacher/quiz/create' },
  { icon: 'bar_chart', label: 'Analytics', to: '/teacher/analytics' },
  { icon: 'groups', label: 'Student Progress', to: '/teacher/students' },
];

/**
 * AppLayout wraps a sidebar + main content area.
 * @param {{ role: 'student' | 'teacher', children: React.ReactNode }} props
 */
export default function AppLayout({ role, children }) {
  const navItems = role === 'teacher' ? TEACHER_NAV : STUDENT_NAV;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const mobileMenuButtonRef = useRef(null);

  return (
    <div className="flex min-h-screen bg-surface text-on-surface" style={{ fontFamily: "'Geist Variable', sans-serif" }}>
      <Sidebar
        items={navItems}
        open={sidebarOpen}
        onOpenChange={setSidebarOpen}
        mobileMenuButtonRef={mobileMenuButtonRef}
      />
      <button
        ref={mobileMenuButtonRef}
        type="button"
        className="lg:hidden fixed top-4 left-4 z-[60] p-2 rounded-xl bg-white border border-outline-variant shadow-sm"
        onClick={() => setSidebarOpen(true)}
        aria-label="Open navigation menu"
      >
        <span className="material-symbols-outlined text-[24px]">menu</span>
      </button>
      <main className="flex-1 lg:ml-64 p-margin-mobile lg:p-margin-desktop min-h-screen">
        {children}
      </main>
    </div>
  );
}
