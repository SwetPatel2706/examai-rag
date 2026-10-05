import React, { useCallback, useEffect, useState } from 'react';
import { SectionHeader } from '@/components/ui/shared';
import { ErrorState, LoadingState } from '@/components/ui/states';
import useAuthStore from '@/store/authStore';
import {
  assignTeacher,
  createAdminSubject,
  createAdminUser,
  deleteAdminSubject,
  deleteAdminUser,
  enrollStudent,
  listAdminSubjects,
  listAdminUsers,
  unassignTeacher,
  unenrollStudent,
  updateAdminSubject,
} from '@/api/admin';

function useAdminList(fetcher, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetcher());
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, loading, error, reload, setData };
}

function UserForm({ onCreate }) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('teacher');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      await onCreate({ email, name, role, password });
      setEmail('');
      setName('');
      setPassword('');
    } catch (err) {
      setFormError(err.message || 'Could not create user.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap gap-2 items-end">
      <label className="flex flex-col text-sm">
        Email
        <input className="border rounded px-2 py-1" value={email} onChange={(e) => setEmail(e.target.value)} required type="email" />
      </label>
      <label className="flex flex-col text-sm">
        Name
        <input className="border rounded px-2 py-1" value={name} onChange={(e) => setName(e.target.value)} required minLength={1} />
      </label>
      <label className="flex flex-col text-sm">
        Role
        <select className="border rounded px-2 py-1" value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="teacher">Teacher</option>
          <option value="student">Student</option>
        </select>
      </label>
      <label className="flex flex-col text-sm">
        Password
        <input className="border rounded px-2 py-1" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} type="password" />
      </label>
      <button type="submit" disabled={saving} className="px-3 py-1.5 rounded bg-primary text-white text-sm disabled:opacity-50">
        {saving ? 'Adding…' : 'Add user'}
      </button>
      {formError && <span className="text-sm text-error">{formError}</span>}
    </form>
  );
}

function SubjectForm({ onCreate }) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      await onCreate(name.trim());
      setName('');
    } catch (err) {
      setFormError(err.message || 'Could not create subject.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex gap-2 items-end">
      <label className="flex flex-col text-sm">
        Subject name
        <input className="border rounded px-2 py-1" value={name} onChange={(e) => setName(e.target.value)} required minLength={1} />
      </label>
      <button type="submit" disabled={saving} className="px-3 py-1.5 rounded bg-primary text-white text-sm disabled:opacity-50">
        {saving ? 'Adding…' : 'Add subject'}
      </button>
      {formError && <span className="text-sm text-error">{formError}</span>}
    </form>
  );
}

export default function AdminDashboard() {
  const user = useAuthStore((s) => s.user);
  const [roleFilter, setRoleFilter] = useState('');
  const usersApi = useAdminList(() => listAdminUsers({ role: roleFilter || undefined, size: 100 }), [roleFilter]);
  const subjectsApi = useAdminList(() => listAdminSubjects(), []);
  const [actionError, setActionError] = useState(null);

  async function run(action) {
    setActionError(null);
    try {
      await action();
      await Promise.all([usersApi.reload(), subjectsApi.reload()]);
    } catch (err) {
      setActionError(err.message || 'Request failed.');
      throw err;
    }
  }

  const initialLoading = (usersApi.loading && usersApi.data == null) || (subjectsApi.loading && subjectsApi.data == null);
  if (initialLoading) return <LoadingState label="Loading admin data…" />;
  const pageError = (usersApi.data == null && usersApi.error) || (subjectsApi.data == null && subjectsApi.error);
  if (pageError) {
    return <ErrorState message={pageError.message} onRetry={() => { usersApi.reload(); subjectsApi.reload(); }} />;
  }

  const users = usersApi.data?.items || [];
  const subjects = subjectsApi.data || [];

  return (
    <div className="flex flex-col gap-8">
      <SectionHeader
        title={`Admin — ${user?.name || 'Dashboard'}`}
        subtitle="Manage teachers, students, and subjects."
      />
      {actionError && <p className="text-sm text-error">{actionError}</p>}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Users</h2>
        <div className="flex gap-2 items-center text-sm">
          <label>
            Filter by role:{' '}
            <select className="border rounded px-2 py-1" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
              <option value="">All</option>
              <option value="teacher">Teachers</option>
              <option value="student">Students</option>
            </select>
          </label>
          <span className="text-on-surface-variant">{usersApi.data?.total ?? users.length} total</span>
        </div>
        <UserForm onCreate={async (payload) => run(() => createAdminUser(payload))} />
        <table className="text-sm border-collapse">
          <thead>
            <tr className="text-left border-b">
              <th className="py-1 pr-4">Name</th>
              <th className="py-1 pr-4">Email</th>
              <th className="py-1 pr-4">Role</th>
              <th className="py-1">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b">
                <td className="py-1 pr-4">{u.name}</td>
                <td className="py-1 pr-4">{u.email}</td>
                <td className="py-1 pr-4">{u.role}</td>
                <td className="py-1">
                  <button
                    type="button"
                    className="text-error underline"
                    onClick={() => run(() => deleteAdminUser(u.id))}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Subjects</h2>
        <SubjectForm onCreate={(name) => run(() => createAdminSubject(name))} />
        <table className="text-sm border-collapse">
          <thead>
            <tr className="text-left border-b">
              <th className="py-1 pr-4">Name</th>
              <th className="py-1">Actions</th>
            </tr>
          </thead>
          <tbody>
            {subjects.map((s) => (
              <tr key={s.id} className="border-b">
                <td className="py-1 pr-4">{s.name}</td>
                <td className="py-1 flex gap-3">
                  <button
                    type="button"
                    className="underline"
                    onClick={() => {
                      const next = window.prompt('Rename subject', s.name);
                      if (next?.trim() && next.trim() !== s.name) run(() => updateAdminSubject(s.id, next.trim()));
                    }}
                  >
                    Rename
                  </button>
                  <button type="button" className="text-error underline" onClick={() => run(() => deleteAdminSubject(s.id))}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-on-surface-variant">
          To assign teachers or enroll students, use a subject ID with the API: POST /api/admin/subjects/:id/teachers
          {'{'}teacher_id{'}'} and POST /api/admin/subjects/:id/students {'{'}student_id{'}'}.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Membership quick-assign</h2>
        <MembershipForm subjects={subjects} users={users} onAssign={(kind, subjectId, userId) => run(() => (
          kind === 'teacher' ? assignTeacher(subjectId, userId) : enrollStudent(subjectId, userId)
        ))} onUnassign={(kind, subjectId, userId) => run(() => (
          kind === 'teacher' ? unassignTeacher(subjectId, userId) : unenrollStudent(subjectId, userId)
        ))} />
      </section>
    </div>
  );
}

function MembershipForm({ subjects, users, onAssign, onUnassign }) {
  const [subjectId, setSubjectId] = useState('');
  const [userId, setUserId] = useState('');
  const [kind, setKind] = useState('teacher');

  const candidates = users.filter((u) => u.role === kind);

  return (
    <form
      className="flex flex-wrap gap-2 items-end text-sm"
      onSubmit={(e) => {
        e.preventDefault();
        if (subjectId && userId) onAssign(kind, subjectId, userId);
      }}
    >
      <label className="flex flex-col">
        Subject
        <select className="border rounded px-2 py-1" value={subjectId} onChange={(e) => setSubjectId(e.target.value)} required>
          <option value="">Select…</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </label>
      <label className="flex flex-col">
        Kind
        <select className="border rounded px-2 py-1" value={kind} onChange={(e) => { setKind(e.target.value); setUserId(''); }}>
          <option value="teacher">Teacher</option>
          <option value="student">Student</option>
        </select>
      </label>
      <label className="flex flex-col">
        User
        <select className="border rounded px-2 py-1" value={userId} onChange={(e) => setUserId(e.target.value)} required>
          <option value="">Select…</option>
          {candidates.map((u) => (
            <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
          ))}
        </select>
      </label>
      <button type="submit" className="px-3 py-1.5 rounded bg-primary text-white">Assign</button>
      <button
        type="button"
        className="px-3 py-1.5 rounded border"
        onClick={() => { if (subjectId && userId) onUnassign(kind, subjectId, userId); }}
      >
        Remove
      </button>
    </form>
  );
}
