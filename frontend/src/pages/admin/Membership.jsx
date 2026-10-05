import React, { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/ui/page-header';
import { SectionHeader } from '@/components/ui/shared';
import { ErrorState, LoadingState } from '@/components/ui/states';
import {
  assignTeacher,
  enrollStudent,
  listAdminSubjects,
  listAdminUsers,
  unassignTeacher,
  unenrollStudent,
} from '@/api/admin';
import { INPUT_CLASS } from '@/lib/adminStyles';
import { useApi } from '@/lib/useApi';
import { invalidate } from '@/lib/apiCache';
import { runWhenIdle } from '@/lib/idlePrefetch';
import { preloadAdminSiblingsIdle } from '@/lib/lazyRoutes';
import { toast } from '@/store/toastStore';
import {
  Field,
} from './common';

export default function AdminMembership() {
  const [selection, setSelection] = useState({ subjectId: '', kind: 'teacher', userId: '' });
  const [userSearchInput, setUserSearchInput] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Debounced server-side search so the picker reaches users beyond the
  // first page without a request per keystroke.
  React.useEffect(() => {
    const timer = setTimeout(() => setUserSearch(userSearchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [userSearchInput]);

  // Same cached keys as the Users/Subjects pages: navigating between the
  // admin screens reuses one shared, identity-scoped cache entry each.
  const subjectsApi = useApi(() => listAdminSubjects(), [], { key: ['admin', 'subjects'], staleMs: 60_000 });
  const candidatesApi = useApi(
    () => listAdminUsers({ role: selection.kind, search: userSearch || undefined, size: 20 }),
    [selection.kind, userSearch],
    { key: ['admin', 'users', 'picker', selection.kind, userSearch], staleMs: 60_000 }
  );

  React.useEffect(() => {
    runWhenIdle(() => preloadAdminSiblingsIdle());
  }, []);

  const initialLoading = subjectsApi.loading && subjectsApi.data == null;
  if (initialLoading) {
    return (
      <AppLayout role="admin">
        <LoadingState label="Loading membership data…" />
      </AppLayout>
    );
  }

  if (subjectsApi.data == null && subjectsApi.error) {
    return (
      <AppLayout role="admin">
        <ErrorState
          message={subjectsApi.error.message}
          onRetry={() => subjectsApi.reload()}
        />
      </AppLayout>
    );
  }

  const subjects = subjectsApi.data || [];
  const candidates = candidatesApi.data?.items || [];

  async function handleMembership(assign) {
    const { subjectId, kind, userId } = selection;
    // Only one membership request at a time: the buttons are disabled while
    // this is pending, but guard here too so no second request can sneak in.
    if (!subjectId || !userId || submitting) return;
    setSubmitting(true);
    const successMessage =
      kind === 'teacher'
        ? assign ? 'Teacher assigned' : 'Teacher removed'
        : assign ? 'Student enrolled' : 'Student removed';
    try {
      if (kind === 'teacher') {
        if (assign) {
          await assignTeacher(subjectId, userId);
        } else {
          await unassignTeacher(subjectId, userId);
        }
      } else if (assign) {
        await enrollStudent(subjectId, userId);
      } else {
        await unenrollStudent(subjectId, userId);
      }
      // Drill-down caches (user subjects / subject members) go stale here.
      invalidate(['admin', 'user-subjects']);
      invalidate(['admin', 'subject-members']);
      // Only the request that was allowed to run reports success.
      toast.success(successMessage);
    } catch (err) {
      // Same channel as success: a temporary toast, not a permanent banner.
      toast.error(err.message || 'Could not update membership.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppLayout role="admin">
      <PageHeader
        title="Membership"
        description="Assign teachers or enroll students in a subject."
      />

      <section className="bg-white rounded-2xl ambient-shadow p-sp-md">
        <SectionHeader title="Assign or remove" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-sp-md mb-sp-md">
          <Field label="Subject" htmlFor="admin-membership-subject">
            <select
              id="admin-membership-subject"
              value={selection.subjectId}
              onChange={(e) => setSelection((m) => ({ ...m, subjectId: e.target.value }))}
              className={INPUT_CLASS}
            >
              <option value="">Select…</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Kind" htmlFor="admin-membership-kind">
            <select
              id="admin-membership-kind"
              value={selection.kind}
              onChange={(e) => setSelection((m) => ({ ...m, kind: e.target.value, userId: '' }))}
              className={INPUT_CLASS}
            >
              <option value="teacher">Teacher</option>
              <option value="student">Student</option>
            </select>
          </Field>
          <Field label="Find user" htmlFor="admin-membership-user-search">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary text-[18px]">search</span>
              <input
                id="admin-membership-user-search"
                type="text"
                value={userSearchInput}
                onChange={(e) => { setUserSearchInput(e.target.value); setSelection((m) => ({ ...m, userId: '' })); }}
                placeholder="Type to filter…"
                className="w-full h-10 rounded-xl border border-outline-variant bg-surface-container-low pl-10 pr-3 font-label-md text-label-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
              />
            </div>
          </Field>
          <Field label="User" htmlFor="admin-membership-user">
            <select
              id="admin-membership-user"
              value={selection.userId}
              onChange={(e) => setSelection((m) => ({ ...m, userId: e.target.value }))}
              className={INPUT_CLASS}
            >
              <option value="">{candidatesApi.loading ? 'Searching…' : 'Select…'}</option>
              {candidates.map((u) => (
                <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
              ))}
            </select>
          </Field>
        </div>
        <div className="flex gap-sp-sm">
          <button
            type="button"
            disabled={!selection.subjectId || !selection.userId || submitting}
            onClick={() => handleMembership(true)}
            className="h-10 px-6 bg-primary text-on-primary font-label-md text-label-md rounded-xl hover:scale-[0.98] transition-all disabled:opacity-40"
          >
            {submitting ? 'Saving…' : 'Assign'}
          </button>
          <button
            type="button"
            disabled={!selection.subjectId || !selection.userId || submitting}
            onClick={() => handleMembership(false)}
            className="h-10 px-6 rounded-xl border border-outline-variant text-secondary font-label-md text-label-md hover:bg-surface-container-low transition-colors disabled:opacity-40"
          >
            Remove
          </button>
        </div>
      </section>
    </AppLayout>
  );
}
