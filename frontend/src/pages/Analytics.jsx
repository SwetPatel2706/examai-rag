import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { SectionHeader } from '@/components/ui/shared';
import { LoadingState, EmptyState, ErrorState } from '@/components/ui/states';
import { cn } from '@/lib/utils';
import { useApi } from '@/lib/useApi';
import { getQuizAnalytics, getTeacherSubjects } from '@/api/analytics';
import { listQuizzes } from '@/api/quizzes';

function accuracyColor(pct) {
  if (pct >= 80) return 'bg-tertiary text-on-tertiary-fixed';
  if (pct >= 60) return 'bg-primary text-on-primary';
  if (pct >= 40) return 'bg-secondary text-on-secondary';
  return 'bg-error text-on-error';
}

const BAND_STYLES = {
  A: { bar: 'bg-tertiary', text: 'text-tertiary' },
  B: { bar: 'bg-primary', text: 'text-primary' },
  C: { bar: 'bg-secondary', text: 'text-secondary' },
  D: { bar: 'bg-error', text: 'text-error' },
  F: { bar: 'bg-error', text: 'text-error' },
};

export default function Analytics() {
  const [selectedQuizId, setSelectedQuizId] = useState(null);

  const subjectsApi = useApi(getTeacherSubjects, []);
  const quizzesApi = useApi(listQuizzes, []);
  const publishedQuizzes = (quizzesApi.data || []).filter((q) => q.status === 'published');

  // Default to the first published quiz once loaded.
  useEffect(() => {
    if (!selectedQuizId && publishedQuizzes.length > 0) {
      setSelectedQuizId(publishedQuizzes[0].id);
    }
  }, [selectedQuizId, publishedQuizzes]);

  const analyticsApi = useApi(
    () => (selectedQuizId ? getQuizAnalytics(selectedQuizId) : Promise.resolve(null)),
    [selectedQuizId]
  );

  if (subjectsApi.loading || quizzesApi.loading) {
    return (
      <AppLayout role="teacher">
        <LoadingState label="Loading analytics…" />
      </AppLayout>
    );
  }

  const pageError = subjectsApi.error || quizzesApi.error;
  if (pageError) {
    return (
      <AppLayout role="teacher">
        <ErrorState message={pageError.message} onRetry={pageError && subjectsApi.error ? subjectsApi.reload : quizzesApi.reload} />
      </AppLayout>
    );
  }

  const subjectNameById = new Map((subjectsApi.data || []).map((s) => [s.subjectId, s.name]));

  return (
    <AppLayout role="teacher">
      <header className="mb-sp-xl flex items-start justify-between gap-4">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-background">Analytics</h1>
          <p className="font-body-md text-body-md text-secondary mt-1">
            Per-quiz class-wide results breakdown.
          </p>
        </div>
        {/* Quiz selector */}
        {publishedQuizzes.length > 0 && (
          <select
            className="border border-outline-variant rounded-xl px-sp-md py-sp-sm font-label-md text-label-md outline-none focus:border-primary bg-white shrink-0 max-w-[320px]"
            value={selectedQuizId ?? ''}
            onChange={(e) => setSelectedQuizId(e.target.value)}
          >
            {publishedQuizzes.map((q) => (
              <option key={q.id} value={q.id}>
                {q.topic} — {subjectNameById.get(q.subjectId) || 'Unknown'}
              </option>
            ))}
          </select>
        )}
      </header>

      {publishedQuizzes.length === 0 ? (
        <EmptyState
          icon="bar_chart"
          title="No published quizzes"
          description="Publish a quiz first — analytics appear once students start taking it."
        />
      ) : analyticsApi.loading ? (
        <LoadingState label="Loading quiz analytics…" />
      ) : analyticsApi.error ? (
        <ErrorState message={analyticsApi.error.message} onRetry={analyticsApi.reload} />
      ) : analyticsApi.data && analyticsApi.data.empty ? (
        <EmptyState
          icon="bar_chart"
          title="No attempts yet"
          description={`No students have completed "${analyticsApi.data.quizTopic}" yet. Analytics will appear as attempts come in.`}
        />
      ) : analyticsApi.data ? (
        (() => {
          const data = analyticsApi.data;
          const stats = [
            { icon: 'groups', label: 'Class Size', value: data.classSize, iconBg: 'bg-primary-fixed', iconColor: 'text-primary' },
            { icon: 'assignment_turned_in', label: 'Completed', value: `${data.attemptCount}/${data.classSize}`, iconBg: 'bg-tertiary-fixed/30', iconColor: 'text-tertiary' },
            { icon: 'percent', label: 'Completion', value: `${data.completionPct}%`, iconBg: 'bg-secondary-container', iconColor: 'text-secondary' },
            { icon: 'leaderboard', label: 'Class Avg', value: `${data.avgScore}%`, iconBg: 'bg-primary-fixed', iconColor: 'text-primary' },
          ];

          return (
            <>
              {/* Top stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-sp-md mb-sp-xl">
                {stats.map((stat) => (
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
                      {data.questionAccuracy.map((q) => (
                        <div
                          key={q.questionId}
                          className={cn('rounded-xl p-3 flex flex-col gap-1 transition-transform hover:scale-105', accuracyColor(q.accuracy))}
                        >
                          <span className="text-[11px] font-bold opacity-80 uppercase tracking-wider truncate">{q.questionText}</span>
                          <span className="text-[24px] font-bold leading-none">{q.accuracy}%</span>
                          <span className="text-[10px] opacity-70">correct</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-4 mt-sp-md pt-sp-md border-t border-outline-variant flex-wrap">
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
                      {data.gradeDistribution.map((g) => {
                        const style = BAND_STYLES[g.band] ?? BAND_STYLES.F;
                        return (
                          <div key={g.band}>
                            <div className="flex justify-between font-label-sm text-label-sm mb-sp-xs">
                              <span className="text-on-surface-variant">{g.band} ({g.minScore}–{g.maxScore})</span>
                              <span className={style.text}>{g.pct}%</span>
                            </div>
                            <div className="w-full h-2 bg-surface-container-high rounded-full overflow-hidden">
                              <div className={cn('h-full rounded-full', style.bar)} style={{ width: `${g.pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
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
            </>
          );
        })()
      ) : null}
    </AppLayout>
  );
}
