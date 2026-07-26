import React from 'react';
import Sidebar from './Sidebar';

const STUDENT_NAV = [
  { icon: 'home', label: 'Home', to: '/student' },
  { icon: 'chat_bubble', label: 'Chat', to: '/student/chat' },
  { icon: 'quiz', label: 'Quizzes', to: '/student/quizzes' },
  { icon: 'style', label: 'Flashcards', to: '/student/flashcards' },
  { icon: 'menu_book', label: 'Resources', to: '/student/materials' },
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

  return (
    <div className="flex min-h-screen bg-surface text-on-surface" style={{ fontFamily: "'Geist Variable', sans-serif" }}>
      <Sidebar items={navItems} />
      <main className="flex-1 ml-64 p-margin-desktop min-h-screen">
        {children}
      </main>
    </div>
  );
}
