import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// Auth
import Login from './pages/Login';

// Student pages
import StudentDashboard from './pages/StudentDashboard';
import SubjectOverview from './pages/SubjectOverview';
import Chat from './pages/Chat';
import Quizzes from './pages/Quizzes';
import QuizTaking from './pages/QuizTaking';
import QuizResults from './pages/QuizResults';
import FlashcardDecks from './pages/FlashcardDecks';
import FlashcardStudy from './pages/FlashcardStudy';
import StudentMaterials from './pages/StudentMaterials';

// Teacher pages
import TeacherDashboard from './pages/TeacherDashboard';
import TeacherMaterials from './pages/TeacherMaterials';
import QuizCreateEdit from './pages/QuizCreateEdit';
import Analytics from './pages/Analytics';
import StudentProgress from './pages/StudentProgress';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />

        {/* ── Student ── */}
        <Route path="/student" element={<StudentDashboard />} />
        <Route path="/student/subject/:id" element={<SubjectOverview />} />
        <Route path="/student/chat" element={<Chat />} />
        <Route path="/student/quizzes" element={<Quizzes />} />
        <Route path="/student/quiz/:id" element={<QuizTaking />} />
        <Route path="/student/quiz/:id/results" element={<QuizResults />} />
        <Route path="/student/flashcards" element={<FlashcardDecks />} />
        <Route path="/student/flashcards/:id/study" element={<FlashcardStudy />} />
        <Route path="/student/materials" element={<StudentMaterials />} />

        {/* ── Teacher ── */}
        <Route path="/teacher" element={<TeacherDashboard />} />
        <Route path="/teacher/materials" element={<TeacherMaterials />} />
        <Route path="/teacher/quiz/create" element={<QuizCreateEdit />} />
        <Route path="/teacher/analytics" element={<Analytics />} />
        <Route path="/teacher/students" element={<StudentProgress />} />

        {/* Legacy redirects for old routes */}
        <Route path="/student-old" element={<Navigate to="/student" replace />} />
        <Route path="/teacher-old" element={<Navigate to="/teacher" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
