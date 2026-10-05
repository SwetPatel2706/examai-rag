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
import { useAdminAction, useAdminList } from '@/lib/useAdminList';
import {
  ActionErrorBanner,
  Field,
} from './common';

export default function AdminMembership() {
  const [selection, setSelection] = useState({ subjectId: '', kind: 'teacher', userId: '' });

  const usersApi = useAdminList(() => listAdminUsers({ size: 100 }), []);
  const subjectsApi = useAdminList(() => listAdminSubjects(), []);
  // Membership changes only touch relations, so no list reload is needed —
  // the runner is used here for its shared error handling.
  const { actionError, run } = useAdminAction([]);

  const initialLoading =
    (usersApi.loading && usersApi.data == null) || (subjectsApi.loading && subjectsApi.data == null);
  if (initialLoading) {
    return (
      <AppLayout role="admin">
        <LoadingState label="Loading membership data…" />
      </AppLayout>
    );
  }

  const pageError = (usersApi.data == null && usersApi.error) || (subjectsApi.data == null && subjectsApi.error);
  if (pageError) {
    return (
      <AppLayout role="admin">
        <ErrorState
          message={pageError.message}
          onRetry={() => { usersApi.reload(); subjectsApi.reload(); }}
        />
      </AppLayout>
    );
  }

  const allUsers = usersApi.data?.items || [];
  const subjects = subjectsApi.data || [];
  const candidates = allUsers.filter((u) => u.role === selection.kind);

  async function handleMembership(assign) {
    const { subjectId, kind, userId } = selection;
    if (!subjectId || !userId) return;
    const options = { rethrow: false };
    if (kind === 'teacher') {
      await run(() => (assign ? assignTeacher(subjectId, userId) : unassignTeacher(subjectId, userId)), options);
    } else {
      await run(() => (assign ? enrollStudent(subjectId, userId) : unenrollStudent(subjectId, userId)), options);
    }
  }

  return (
    <AppLayout role="admin">
      <PageHeader
        title="Membership"
        description="Assign teachers or enroll students in a subject."
      />

      <ActionErrorBanner message={actionError} />

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
          <Field label="User" htmlFor="admin-membership-user">
            <select
              id="admin-membership-user"
              value={selection.userId}
              onChange={(e) => setSelection((m) => ({ ...m, userId: e.target.value }))}
              className={INPUT_CLASS}
            >
              <option value="">Select…</option>
              {candidates.map((u) => (
                <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
              ))}
            </select>
          </Field>
        </div>
        <div className="flex gap-sp-sm">
          <button
            type="button"
            disabled={!selection.subjectId || !selection.userId}
            onClick={() => handleMembership(true)}
            className="h-10 px-6 bg-primary text-on-primary font-label-md text-label-md rounded-xl hover:scale-[0.98] transition-all disabled:opacity-40"
          >
            Assign
          </button>
          <button
            type="button"
            disabled={!selection.subjectId || !selection.userId}
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
