import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { ProgressBar, SectionHeader } from '@/components/ui/shared';
import { LoadingState, EmptyState, ErrorState } from '@/components/ui/states';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useApi } from '@/lib/useApi';
import useSubjectStore from '@/store/subjectStore';
import { getSubject, listSubjectMaterials } from '@/api/subjects';
import { listQuizzes, listMyAttempts } from '@/api/quizzes';
import { getStudentSubjects } from '@/api/analytics';
import { initials } from '@/lib/utils';
import { groupByTeacher } from '@/lib/materials';

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
  return (
    <div className="flex items-center gap-2 bg-white border border-outline-variant rounded-full px-3 py-1.5">
      <Avatar size="sm">
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
      <div>
        <p className="font-label-md text-label-md text-on-surface">{teacher.name}</p>
        {teacher.email && <p className="text-[11px] text-secondary">{teacher.email}</p>}
      </div>
    </div>
  );
}

export default function SubjectOverview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const setCurrentSubject = useSubjectStore((s) => s.setCurrentSubject);

  const { data, loading, error, reload } = useApi(async () => {
    const [subject, materials, quizzes, attempts, cards] = await Promise.all([
      getSubject(id),
      listSubjectMaterials(id, { status: 'ready', size: 100 }),
      listQuizzes(id),
      listMyAttempts(),
      getStudentSubjects(),
    ]);
    setCurrentSubject(id);
    return { subject, materials, quizzes, attempts, cards };
  }, [id]);

  if (loading) {
    return (
      <AppLayout role="student">
        <LoadingState label="Loading subject…" />
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout role="student">
        <ErrorState message={error.message} onRetry={reload} />
      </AppLayout>
    );
  }

  const { subject, materials, quizzes, attempts, cards } = data;
  const subjectCard = (cards || []).find((c) => c.subjectId === id);
  const progress = subjectCard?.progress ?? 0;

  const materialsByTeacher = groupByTeacher(materials.items);

  // Map attempt → quiz status
  const attemptsByQuiz = new Map((attempts || []).map((a) => [a.quizId, a]));
  const subjectQuizzes = (quizzes || [])
    .filter((q) => q.subjectId === id)
    .map((quiz) => {
      const attempt = attemptsByQuiz.get(quiz.id);
      return {
        id: quiz.id,
        title: quiz.topic,
        questions: quiz.questionCount,
        status: attempt ? 'completed' : 'not_started',
        score: attempt ? attempt.score : null,
      };
    });

  return (
    <AppLayout role="student">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 mb-sp-lg text-on-surface-variant font-label-md text-label-md">
        <button onClick={() => navigate('/student')} className="hover:text-primary transition-colors">Home</button>
        <span className="material-symbols-outlined text-[16px]">chevron_right</span>
        <span className="text-on-surface">{subject.name}</span>
      </nav>

      {/* Header */}
      <header className="mb-sp-xl">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-sp-md">
          <div>
            <h1 className="font-headline-lg text-headline-lg text-on-background mb-2">{subject.name}</h1>
            <p className="font-body-md text-body-md text-secondary max-w-xl">
              Study materials and quizzes for {subject.name}.
            </p>
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
        <div className="mt-sp-lg max-w-sm">
          <div className="flex justify-between mb-1 text-[12px] font-label-md">
            <span className="text-secondary">Overall Progress</span>
            <span className="text-on-background font-bold">{progress}%</span>
          </div>
          <ProgressBar value={progress} />
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-sp-lg">
        {/* Left — Teachers + Materials */}
        <div className="lg:col-span-2 space-y-sp-xl">
          {/* Teachers */}
          <section>
            <SectionHeader title="Instructors" />
            {subject.teachers.length === 0 ? (
              <p className="text-on-surface-variant font-body-md text-body-md">No instructors listed yet.</p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {subject.teachers.map((t) => <TeacherChip key={t.id} teacher={t} />)}
              </div>
            )}
          </section>

          {/* Materials grouped by teacher */}
          <section>
            <SectionHeader title="Study Materials" />
            {materialsByTeacher.length === 0 ? (
              <EmptyState
                icon="description"
                title="No materials yet"
                description="No ready materials are available for this subject yet."
              />
            ) : (
              <div className="space-y-sp-lg">
                {materialsByTeacher.map(({ teacher, materials: mats }) => (
                  <div key={teacher.id}>
                    <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-2">
                      {teacher.name}
                    </p>
                    <div className="space-y-2">
                      {mats.map((mat) => (
                        <div key={mat.id} className="flex items-center gap-3 bg-white p-3 rounded-xl border border-outline-variant ambient-shadow-sm">
                          <div className="w-9 h-9 rounded-lg bg-primary-fixed flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-primary text-[18px]">description</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-label-md text-label-md text-on-surface truncate">{mat.name}</p>
                          </div>
                          <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">{mat.type}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
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
          {subjectQuizzes.length === 0 ? (
            <div className="bg-white rounded-2xl ambient-shadow p-sp-md">
              <EmptyState
                icon="quiz"
                title="No quizzes yet"
                description="This subject has no published quizzes yet."
              />
            </div>
          ) : (
            <div className="space-y-3">
              {subjectQuizzes.map((quiz) => (
                <div key={quiz.id} className="bg-white p-sp-md rounded-2xl ambient-shadow card-hover">
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
          )}
        </div>
      </div>
    </AppLayout>
  );
}
