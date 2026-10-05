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
import { createAdminSubject, deleteAdminSubject, listAdminSubjects, updateAdminSubject } from '@/api/admin';
import { INPUT_CLASS } from '@/lib/adminStyles';
import { useAdminAction, useAdminList } from '@/lib/useAdminList';
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

export default function AdminSubjects() {
  const [dialog, setDialog] = useState(null);

  const subjectsApi = useAdminList(() => listAdminSubjects(), []);
  const { actionError, run } = useAdminAction([subjectsApi.reload]);

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
    await run(() => deleteAdminSubject(s.id), { rethrow: false });
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
            {subjects.map((s) => (
              <li key={s.id} className="flex items-center gap-3 px-sp-md py-sp-md hover:bg-surface-container-low transition-colors group">
                <span className="material-symbols-outlined text-secondary text-[20px]">library_books</span>
                <span className="font-label-md text-label-md text-on-surface truncate flex-1">{s.name}</span>
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
              </li>
            ))}
          </ul>
        )}
      </section>

      <SubjectDialog
        dialog={dialog}
        onClose={() => setDialog(null)}
        onCreate={(name) => run(() => createAdminSubject(name))}
        onRename={(id, name) => run(() => updateAdminSubject(id, name))}
      />
    </AppLayout>
  );
}
