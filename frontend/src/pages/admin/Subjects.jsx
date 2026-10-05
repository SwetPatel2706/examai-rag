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
import { createAdminSubject, deleteAdminSubject, getAdminSubjectMembers, listAdminSubjects, updateAdminSubject } from '@/api/admin';
import { INPUT_CLASS } from '@/lib/adminStyles';
import { cn, initials } from '@/lib/utils';
import { useAdminAction } from '@/lib/useAdminAction';
import { useApi } from '@/lib/useApi';
import { runWhenIdle } from '@/lib/idlePrefetch';
import { preloadAdminSiblingsIdle } from '@/lib/lazyRoutes';
import { toast } from '@/store/toastStore';
import {
  ActionErrorBanner,
  Field,
  FormError,
} from './common';

function SubjectDialog({ dialog, onClose, onCreate, onRename }) {
  const isRename = dialog?.mode === 'rename';
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  React.useEffect(() => {
    setName(isRename ? dialog.subject.name : '');
    setFormError(null);
  }, [dialog, isRename]);

  if (!dialog) return null;

  async function submit(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setSaving(true);
    setFormError(null);
    try {
      if (isRename) {
        await onRename(dialog.subject.id, trimmed);
      } else {
        await onCreate(trimmed);
      }
      onClose();
    } catch (err) {
      setFormError(err.message || 'Could not save subject.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg w-full">
        <DialogHeader>
          <DialogTitle>{isRename ? 'Rename subject' : 'Add subject'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-sp-md">
          <Field label="Subject name" htmlFor="admin-subject-name">
            <input
              id="admin-subject-name"
              required
              minLength={1}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Linear Algebra"
              className={INPUT_CLASS}
            />
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
              {saving ? 'Saving…' : isRename ? 'Save' : 'Add subject'}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Lazily loaded member roster for an expanded subject. Mounted only on expand. */
function SubjectMemberList({ subjectId }) {
  const api = useApi(() => getAdminSubjectMembers(subjectId), [subjectId], {
    key: ['admin', 'subject-members', subjectId],
    staleMs: 60_000,
  });

  if (api.loading) {
    return <p className="font-label-md text-label-md text-secondary py-2">Loading members…</p>;
  }
  if (api.error || api.data == null) {
    return <p className="font-label-md text-label-md text-error py-2">Could not load members.</p>;
  }
  const teachers = api.data.teachers || [];
  const students = api.data.students || [];
  if (teachers.length === 0 && students.length === 0) {
    return (
      <p className="font-label-md text-label-md text-secondary py-2">
        No members yet. Use the Membership page to assign teachers or enroll students.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-sp-sm py-2">
      {teachers.length > 0 && (
        <div>
          <p className="font-label-sm text-label-sm text-secondary uppercase tracking-wider mb-1">
            Teachers · {teachers.length}
          </p>
          <ul className="flex flex-wrap gap-2">
            {teachers.map((t) => (
              <li
                key={t.id}
                className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full bg-surface-container font-label-md text-label-md text-on-surface"
              >
                <span className="w-6 h-6 rounded-full bg-primary-fixed text-primary flex items-center justify-center font-bold text-[11px]">
                  {initials(t.name)}
                </span>
                {t.name}
              </li>
            ))}
          </ul>
        </div>
      )}
      {students.length > 0 && (
        <div>
          <p className="font-label-sm text-label-sm text-secondary uppercase tracking-wider mb-1">
            Students · {students.length}
          </p>
          <ul className="flex flex-wrap gap-2">
            {students.map((s) => (
              <li
                key={s.id}
                className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full bg-surface-container font-label-md text-label-md text-on-surface"
              >
                <span className="w-6 h-6 rounded-full bg-tertiary-fixed/30 text-tertiary flex items-center justify-center font-bold text-[11px]">
                  {initials(s.name)}
                </span>
                {s.name}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function AdminSubjects() {
  const [dialog, setDialog] = useState(null);
  const [expandedSubjectId, setExpandedSubjectId] = useState(null);

  const subjectsApi = useApi(() => listAdminSubjects(), [], { key: ['admin', 'subjects'], staleMs: 60_000 });
  const { actionError, run } = useAdminAction([subjectsApi.reload]);

  React.useEffect(() => {
    runWhenIdle(() => preloadAdminSiblingsIdle());
  }, []);

  if (subjectsApi.loading && subjectsApi.data == null) {
    return (
      <AppLayout role="admin">
        <LoadingState label="Loading subjects…" />
      </AppLayout>
    );
  }

  if (subjectsApi.data == null && subjectsApi.error) {
    return (
      <AppLayout role="admin">
        <ErrorState message={subjectsApi.error.message} onRetry={subjectsApi.reload} />
      </AppLayout>
    );
  }

  const subjects = subjectsApi.data || [];

  async function handleDelete(s) {
    const ok = window.confirm(`Delete subject "${s.name}"? Materials, quizzes, and enrollments go with it.`);
    if (!ok) return;
    await run(async () => {
      await deleteAdminSubject(s.id);
      toast.success('Subject deleted');
    }, { rethrow: false });
  }

  return (
    <AppLayout role="admin">
      <PageHeader
        title="Subjects"
        description="Create, rename, and remove subjects."
        action={(
          <button
            type="button"
            onClick={() => setDialog({ mode: 'create' })}
            className="h-10 px-6 bg-primary text-on-primary font-label-md text-label-md rounded-full flex items-center gap-2 hover:scale-95 transition-all duration-150 shadow-md"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Add subject
          </button>
        )}
      />

      <ActionErrorBanner message={actionError} />

      <section className="bg-white rounded-2xl ambient-shadow overflow-hidden">
        <div className="p-sp-md pb-0">
          <SectionHeader
            title="All subjects"
            action={<span className="font-label-sm text-label-sm text-secondary">{subjects.length} total</span>}
          />
        </div>
        {subjects.length === 0 ? (
          <EmptyState icon="library_books" title="No subjects yet" description="Add your first subject to get started." />
        ) : (
          <ul className="divide-y divide-surface-container-high border-t border-surface-container-high">
            {subjects.map((s) => {
              const isExpanded = expandedSubjectId === s.id;
              const toggle = () => setExpandedSubjectId(isExpanded ? null : s.id);
              return (
                <li key={s.id} className={cn(isExpanded && 'bg-primary-fixed/10')}>
                  <div className="flex items-center gap-3 px-sp-md py-sp-md hover:bg-surface-container-low transition-colors group">
                    <button
                      type="button"
                      aria-expanded={isExpanded}
                      onClick={toggle}
                      className="flex items-center gap-3 flex-1 min-w-0 text-left cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary/50 rounded-lg"
                    >
                      <span className="material-symbols-outlined text-secondary text-[20px]">library_books</span>
                      <span className="font-label-md text-label-md text-on-surface truncate flex-1">{s.name}</span>
                      <span className="p-sp-xs text-outline" aria-hidden="true">
                        <span className="material-symbols-outlined text-[18px] block">
                          {isExpanded ? 'expand_less' : 'chevron_right'}
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDialog({ mode: 'rename', subject: s })}
                      title={`Rename ${s.name}`}
                      aria-label={`Rename ${s.name}`}
                      className="p-sp-xs rounded-lg hover:bg-surface-container text-outline hover:text-primary transition-colors opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                    >
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(s)}
                      title={`Delete ${s.name}`}
                      aria-label={`Delete ${s.name}`}
                      className="p-sp-xs rounded-lg hover:bg-error-container text-outline hover:text-error transition-colors opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                  {isExpanded && (
                    <div className="px-sp-md pb-sp-sm bg-surface-container-low/50">
                      <SubjectMemberList subjectId={s.id} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <SubjectDialog
        dialog={dialog}
        onClose={() => setDialog(null)}
        onCreate={async (name) => {
          await run(async () => {
            await createAdminSubject(name);
            toast.success('Subject created');
          });
        }}
        onRename={async (id, name) => {
          await run(async () => {
            await updateAdminSubject(id, name);
            toast.success('Subject renamed');
          });
        }}
      />
    </AppLayout>
  );
}
