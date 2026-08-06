import React, { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { SectionHeader } from '@/components/ui/shared';
import { LoadingState, EmptyState, ErrorState } from '@/components/ui/states';
import { cn } from '@/lib/utils';
import { useApi } from '@/lib/useApi';
import { getStudentProgress, getStudentProgressDetail, getTeacherSubjects } from '@/api/analytics';

function ScoreBadge({ score }) {
  const style =
    score >= 80 ? 'bg-tertiary-fixed/30 text-tertiary' :
    score >= 60 ? 'bg-primary-fixed text-primary' :
    'bg-error-container text-error';
  return <span className={cn('px-2 py-0.5 rounded-full text-[13px] font-bold', style)}>{score}%</span>;
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

function initials(name) {
  return (name || '?')
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function StudentProgress() {
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState(null);

  const subjectsApi = useApi(getTeacherSubjects, []);
  const rosterApi = useApi(
    () => getStudentProgress({ subjectId: subjectFilter === 'all' ? undefined : subjectFilter }),
    [subjectFilter]
  );
  const detailApi = useApi(
    () => (selectedStudentId ? getStudentProgressDetail(selectedStudentId) : Promise.resolve(null)),
    [selectedStudentId]
  );

  if (subjectsApi.loading || rosterApi.loading) {
    return (
      <AppLayout role="teacher">
        <LoadingState label="Loading student progress…" />
      </AppLayout>
    );
  }

  const pageError = subjectsApi.error || rosterApi.error;
  if (pageError) {
    return (
      <AppLayout role="teacher">
        <ErrorState
          message={pageError.message}
          onRetry={() => (subjectsApi.error ? subjectsApi.reload() : rosterApi.reload())}
        />
      </AppLayout>
    );
  }

  const subjects = subjectsApi.data || [];
  const students = (rosterApi.data?.students || []).filter((s) =>
    s.name.toLowerCase().includes(search.trim().toLowerCase())
  );
  const atRiskCount = students.filter((s) => s.atRisk).length;
  const selectedStudent = detailApi.data;

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
          onChange={(e) => { setSubjectFilter(e.target.value); setSelectedStudentId(null); }}
        >
          <option value="all">All Subjects</option>
          {subjects.map((s) => (
            <option key={s.subjectId} value={s.subjectId}>{s.name}</option>
          ))}
        </select>

        {/* At-risk summary chip */}
        <div className="ml-auto flex items-center gap-2 bg-error-container px-3 py-2 rounded-xl">
          <span className="material-symbols-outlined text-error text-[18px]">warning</span>
          <span className="font-label-md text-label-md text-error font-bold">
            {atRiskCount} at-risk
          </span>
        </div>
      </div>

      {students.length === 0 ? (
        <EmptyState
          icon="groups"
          title="No students found"
          description={search ? 'Try a different search term.' : 'Students appear here after they take their first quiz.'}
        />
      ) : (
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
                {students.map((s) => {
                  const isSelected = selectedStudentId === s.studentId;
                  const toggle = () => setSelectedStudentId(isSelected ? null : s.studentId);
                  return (
                    <tr
                      key={s.studentId}
                      tabIndex={0}
                      aria-expanded={isSelected}
                      onClick={toggle}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          toggle();
                        }
                      }}
                      className={cn(
                        'hover:bg-surface-container-low cursor-pointer transition-colors group focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary/50',
                        isSelected && 'bg-primary-fixed/10'
                      )}
                    >
                      <td className="px-sp-md py-sp-md">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            'w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0',
                            s.atRisk ? 'bg-error-container text-error' : 'bg-primary-fixed text-primary'
                          )}>
                            {initials(s.name)}
                          </div>
                          <span className="font-label-md text-label-md text-on-surface">{s.name}</span>
                        </div>
                      </td>
                      <td className="px-sp-md py-sp-md"><ScoreBadge score={s.avgScore} /></td>
                      <td className="px-sp-md py-sp-md">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                            <div className="bg-primary h-full rounded-full" style={{ width: `${s.completionPct}%` }} />
                          </div>
                          <span className="font-label-sm text-label-sm text-secondary">{s.completionPct}%</span>
                        </div>
                      </td>
                      <td className="px-sp-md py-sp-md font-label-sm text-label-sm text-secondary">{formatDate(s.lastActive)}</td>
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
                          {isSelected ? 'expand_less' : 'chevron_right'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Drill-down panel */}
          {selectedStudentId && (
            <div className="bg-white rounded-2xl ambient-shadow p-sp-md h-fit">
              {detailApi.loading ? (
                <LoadingState label="Loading student…" />
              ) : detailApi.error ? (
                <ErrorState message={detailApi.error.message} onRetry={detailApi.reload} />
              ) : selectedStudent ? (
                <>
                  <div className="flex items-center justify-between mb-sp-md">
                    <h3 className="font-headline-md text-headline-md text-on-background">{selectedStudent.name}</h3>
                    <button
                      onClick={() => setSelectedStudentId(null)}
                      className="p-sp-xs rounded-lg hover:bg-surface-container-low text-secondary transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">close</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-sp-sm mb-sp-md">
                    {[
                      { label: 'Avg Score', value: `${selectedStudent.avgScore}%`, color: selectedStudent.avgScore >= 70 ? 'text-tertiary' : 'text-error' },
                      { label: 'Completion', value: `${selectedStudent.completionPct}%`, color: 'text-primary' },
                    ].map((stat) => (
                      <div key={stat.label} className="bg-surface-container-low rounded-xl p-3 text-center">
                        <p className={cn('font-display-lg text-[28px] font-bold leading-none', stat.color)}>{stat.value}</p>
                        <p className="font-label-sm text-label-sm text-secondary mt-1">{stat.label}</p>
                      </div>
                    ))}
                  </div>

                  <SectionHeader title="Quiz History" />
                  <div className="space-y-2">
                    {selectedStudent.quizHistory.length === 0 ? (
                      <p className="font-body-md text-body-md text-on-surface-variant text-center py-4">No quizzes taken yet.</p>
                    ) : (
                      selectedStudent.quizHistory.map((qh) => (
                        <div key={qh.quizId} className="flex items-center justify-between p-3 bg-surface-container-low rounded-xl">
                          <div className="min-w-0">
                            <p className="font-label-md text-label-md text-on-surface truncate">{qh.quizTitle}</p>
                            <p className="font-label-sm text-label-sm text-secondary">{qh.subjectName ?? ''} · {formatDate(qh.submittedAt)}</p>
                          </div>
                          <ScoreBadge score={qh.score} />
                        </div>
                      ))
                    )}
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
                </>
              ) : null}
            </div>
          )}
        </div>
      )}
    </AppLayout>
  );
}
