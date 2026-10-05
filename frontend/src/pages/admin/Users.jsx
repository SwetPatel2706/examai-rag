import React, { useState } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { PageHeader } from '@/components/ui/page-header';
import { SectionHeader } from '@/components/ui/shared';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/states';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn, initials } from '@/lib/utils';
import { INPUT_CLASS } from '@/lib/adminStyles';
import { useAdminAction } from '@/lib/useAdminAction';
import { useApi } from '@/lib/useApi';
import { runWhenIdle } from '@/lib/idlePrefetch';
import { preloadAdminSiblingsIdle } from '@/lib/lazyRoutes';
import { toast } from '@/store/toastStore';
import { createAdminUser, deleteAdminUser, getAdminUserSubjects, listAdminUsers, updateAdminUser } from '@/api/admin';
import {
  ActionErrorBanner,
  Field,
  FormError,
  RoleBadge,
} from './common';

function AddUserDialog({ open, onOpenChange, onCreate }) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('teacher');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  function reset() {
    setEmail('');
    setName('');
    setRole('teacher');
    setPassword('');
    setFormError(null);
  }

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      await onCreate({ email, name, role, password });
      reset();
      onOpenChange(false);
    } catch (err) {
      // Dialog stays open so inputs are preserved; the error is shown inline.
      setFormError(err.message || 'Could not create user.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg w-full">
        <DialogHeader>
          <DialogTitle>Add user</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-sp-md">
          <Field label="Email" htmlFor="admin-user-email">
            <input
              id="admin-user-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@examai.com"
              className={INPUT_CLASS}
            />
          </Field>
          <Field label="Name" htmlFor="admin-user-name">
            <input
              id="admin-user-name"
              required
              minLength={1}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              className={INPUT_CLASS}
            />
          </Field>
          <div className="grid grid-cols-2 gap-sp-md">
            <Field label="Role" htmlFor="admin-user-role">
              <select
                id="admin-user-role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className={INPUT_CLASS}
              >
                <option value="teacher">Teacher</option>
                <option value="student">Student</option>
              </select>
            </Field>
            <Field label="Password" htmlFor="admin-user-password">
              <input
                id="admin-user-password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                className={INPUT_CLASS}
              />
            </Field>
          </div>
          <FormError message={formError} />
          <DialogFooter>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="h-9 px-4 rounded-lg border border-outline-variant text-secondary font-label-md text-label-md hover:bg-surface-container-low transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="h-9 px-6 rounded-lg bg-primary text-on-primary font-label-md text-label-md hover:scale-[0.98] transition-all disabled:opacity-40"
            >
              {saving ? 'Adding…' : 'Add user'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditUserDialog({ user: target, onClose, onSave }) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('teacher');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  React.useEffect(() => {
    setName(target?.name ?? '');
    setRole(target?.role ?? 'teacher');
    setFormError(null);
  }, [target]);

  if (!target) return null;

  async function submit(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    setFormError(null);
    try {
      await onSave(target.id, { name: trimmed, role });
      onClose();
    } catch (err) {
      setFormError(err.message || 'Could not save user.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg w-full">
        <DialogHeader>
          <DialogTitle>Edit user</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-sp-md">
          <Field label="Email" htmlFor="admin-edit-user-email">
            <input
              id="admin-edit-user-email"
              type="email"
              disabled
              value={target.email}
              className={cn(INPUT_CLASS, 'opacity-60')}
            />
          </Field>
          <Field label="Name" htmlFor="admin-edit-user-name">
            <input
              id="admin-edit-user-name"
              required
              minLength={1}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={INPUT_CLASS}
            />
          </Field>
          <Field label="Role" htmlFor="admin-edit-user-role">
            <select
              id="admin-edit-user-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className={INPUT_CLASS}
            >
              <option value="teacher">Teacher</option>
              <option value="student">Student</option>
            </select>
          </Field>
          <FormError message={formError} />
          <DialogFooter>
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 rounded-lg border border-outline-variant text-secondary font-label-md text-label-md hover:bg-surface-container-low transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="h-9 px-6 rounded-lg bg-primary text-on-primary font-label-md text-label-md hover:scale-[0.98] transition-all disabled:opacity-40"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Lazily loaded subject list for an expanded user row. Mounted only on expand. */
function UserSubjectList({ userId, role }) {
  const api = useApi(() => getAdminUserSubjects(userId), [userId], {
    key: ['admin', 'user-subjects', userId],
    staleMs: 60_000,
  });

  if (api.loading) {
    return <p className="font-label-md text-label-md text-secondary py-2">Loading subjects…</p>;
  }
  if (api.error || api.data == null) {
    return <p className="font-label-md text-label-md text-error py-2">Could not load subjects.</p>;
  }
  if (api.data.length === 0) {
    return (
      <p className="font-label-md text-label-md text-secondary py-2">
        {role === 'teacher' ? 'Not assigned to any subject yet.' : 'Not enrolled in any subject yet.'} Use the Membership page to change that.
      </p>
    );
  }
  return (
    <ul className="flex flex-wrap gap-2 py-2" aria-label="Subjects">
      {api.data.map((s) => (
        <li
          key={s.id}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container font-label-md text-label-md text-on-surface"
        >
          <span className="material-symbols-outlined text-[16px] text-secondary">library_books</span>
          {s.name}
        </li>
      ))}
    </ul>
  );
}

const ROLE_TABS = [  { value: '', label: 'All' },
  { value: 'teacher', label: 'Teachers' },
  { value: 'student', label: 'Students' },
];

export default function AdminUsers() {
  const [roleFilter, setRoleFilter] = useState('');
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [expandedUserId, setExpandedUserId] = useState(null);

  // Cached + identity-scoped like the student/teacher lists: warmed at login
  // and on sibling pages, so navigating back renders instantly.
  const usersApi = useApi(() => listAdminUsers({ size: 100 }), [], { key: ['admin', 'users'], staleMs: 60_000 });
  const { actionError, run } = useAdminAction([usersApi.reload]);

  // While the admin works here, warm the sibling admin lists during idle time.
  React.useEffect(() => {
    runWhenIdle(() => preloadAdminSiblingsIdle());
  }, []);

  if (usersApi.loading && usersApi.data == null) {
    return (
      <AppLayout role="admin">
        <LoadingState label="Loading users…" />
      </AppLayout>
    );
  }

  if (usersApi.data == null && usersApi.error) {
    return (
      <AppLayout role="admin">
        <ErrorState message={usersApi.error.message} onRetry={usersApi.reload} />
      </AppLayout>
    );
  }

  const allUsers = usersApi.data?.items || [];
  const visibleUsers = allUsers.filter((u) => {
    if (roleFilter && u.role !== roleFilter) return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (u.name || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q);
  });

  async function handleDelete(u) {
    const ok = window.confirm(`Delete "${u.name}" (${u.email})? This removes them for all subjects.`);
    if (!ok) return;
    await run(async () => {
      await deleteAdminUser(u.id);
      toast.success('User deleted');
    }, { rethrow: false });
  }

  return (
    <AppLayout role="admin">
      <PageHeader
        title="Users"
        description="Create and remove teacher and student accounts."
        action={(
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className="h-10 px-6 bg-primary text-on-primary font-label-md text-label-md rounded-full flex items-center gap-2 hover:scale-95 transition-all duration-150 shadow-md"
          >
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            Add user
          </button>
        )}
      />

      <ActionErrorBanner message={actionError} />

      <section className="bg-white rounded-2xl ambient-shadow overflow-hidden">
        <div className="p-sp-md pb-0">
          <SectionHeader
            title="All users"
            action={<span className="font-label-sm text-label-sm text-secondary">{visibleUsers.length} shown</span>}
          />
          <div className="flex items-center gap-sp-md mb-sp-md flex-wrap">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary text-[18px]">search</span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name or email…"
                aria-label="Search users"
                className="pl-10 pr-4 h-10 border border-outline-variant rounded-xl font-label-md text-label-md outline-none focus:border-primary bg-white transition-colors"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {ROLE_TABS.map((tab) => (
                <button
                  key={tab.label}
                  type="button"
                  onClick={() => setRoleFilter(tab.value)}
                  className={cn(
                    'px-4 py-1.5 rounded-full font-label-md text-label-md transition-all cursor-pointer',
                    roleFilter === tab.value
                      ? 'bg-primary text-on-primary shadow-sm'
                      : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {visibleUsers.length === 0 ? (
          <EmptyState
            icon="group_add"
            title="No users found"
            description={search ? 'Try a different search term.' : 'Add your first teacher or student to get started.'}
          />
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-y border-surface-container-high bg-surface-container-low/50">
                {['User', 'Role', ''].map((col) => (
                  <th key={col} className="px-sp-md py-sp-sm font-label-sm text-label-sm text-on-surface-variant">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-high cv-auto">
              {visibleUsers.map((u) => {
                const isExpanded = expandedUserId === u.id;
                const toggle = () => setExpandedUserId(isExpanded ? null : u.id);
                return (
                  <React.Fragment key={u.id}>
                    <tr
                      className={cn(
                        'hover:bg-surface-container-low transition-colors group',
                        isExpanded && 'bg-primary-fixed/10'
                      )}
                    >
                      <td className="px-sp-md py-sp-md">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={cn(
                            'w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0',
                            u.role === 'teacher' ? 'bg-primary-fixed text-primary' : 'bg-tertiary-fixed/30 text-tertiary'
                          )}>
                            {initials(u.name)}
                          </div>
                      <div className="min-w-0">
                        <p className="font-label-md text-label-md text-on-surface truncate">{u.name}</p>
                        <p className="font-label-sm text-label-sm text-secondary truncate">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-sp-md py-sp-md"><RoleBadge role={u.role} /></td>
                  <td className="px-sp-md py-sp-md text-right">
                    <div className="inline-flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => setEditUser(u)}
                        title={`Edit ${u.name}`}
                        aria-label={`Edit ${u.name}`}
                        className="p-sp-xs rounded-lg hover:bg-surface-container text-outline hover:text-primary transition-colors opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                      >
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(u)}
                        title={`Delete ${u.name}`}
                        aria-label={`Delete ${u.name}`}
                        className="p-sp-xs rounded-lg hover:bg-error-container text-outline hover:text-error transition-colors opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                      <button
                        type="button"
                        onClick={toggle}
                        aria-expanded={isExpanded}
                        aria-label={`Show subjects of ${u.name}`}
                        title={`Show subjects of ${u.name}`}
                        className="p-sp-xs rounded-lg hover:bg-surface-container text-outline hover:text-primary transition-colors opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                      >
                        <span className="material-symbols-outlined text-[18px] block" aria-hidden="true">
                          {isExpanded ? 'expand_less' : 'chevron_right'}
                        </span>
                      </button>
                    </div>
                  </td>
                  </tr>
                    {isExpanded && (
                      <tr className="bg-surface-container-low/50">
                        <td colSpan={3} className="px-sp-md py-sp-sm">
                          <UserSubjectList userId={u.id} role={u.role} />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      <AddUserDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreate={async (payload) => {
          await run(async () => {
            await createAdminUser(payload);
            toast.success('User created');
          });
        }}
      />
      <EditUserDialog
        user={editUser}
        onClose={() => setEditUser(null)}
        onSave={async (id, patch) => {
          await run(async () => {
            await updateAdminUser(id, patch);
            toast.success('User updated');
          });
        }}
      />
    </AppLayout>
  );
}
