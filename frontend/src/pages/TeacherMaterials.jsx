import React, { useState, useEffect, useRef } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { SectionHeader } from '@/components/ui/shared';
import { Pagination } from '@/components/ui/pagination';
import { LoadingState, EmptyState, ErrorState } from '@/components/ui/states';
import { cn } from '@/lib/utils';
import { getTypeConfig } from '@/lib/materials';
import { formatDate } from '@/lib/format';
import { useApi } from '@/lib/useApi';
import useAuthStore from '@/store/authStore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { getTeacherSubjects } from '@/api/analytics';
import { listMaterials, uploadMaterial, getMaterialStatus, retryMaterial, deleteMaterial, getMaterialDownloadUrl } from '@/api/materials';

const ALLOWED_EXTENSIONS = ['pdf', 'docx', 'pptx', 'doc', 'ppt'];
const SUPPORTED_FORMATS = ALLOWED_EXTENSIONS.map((extension) => extension.toUpperCase()).join(', ');
const ACCEPTED_FORMATS = ALLOWED_EXTENSIONS.map((extension) => `.${extension}`).join(',');

const STATUS_BADGE = {
  processing: { label: 'Processing', cls: 'bg-primary-fixed text-primary' },
  ready: { label: 'Ready', cls: 'bg-tertiary-fixed/30 text-tertiary' },
  failed: { label: 'Failed', cls: 'bg-error-container text-error' },
  deleting: { label: 'Deleting', cls: 'bg-surface-container-high text-on-surface-variant' },
};

export default function TeacherMaterials() {
  const user = useAuthStore((s) => s.user);
  const [activeSubjectId, setActiveSubjectId] = useState(null);
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [targetSubjectId, setTargetSubjectId] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [rejectionMsg, setRejectionMsg] = useState(null);
  const fileInputRef = useRef(null);

  const subjectsApi = useApi(getTeacherSubjects, []);

  const materialsApi = useApi(
    () => (activeSubjectId ? listMaterials({ subjectId: activeSubjectId, page, size: 100 }) : Promise.resolve({ items: [], total: 0, pages: 0 })),
    [activeSubjectId, page]
  );
  const materials = materialsApi.data?.items || [];
  const totalMaterials = materialsApi.data?.total ?? 0;
  const totalPages = materialsApi.data?.pages || 1;

  // Default the active subject tab once subjects load.
  useEffect(() => {
    const subjects = subjectsApi.data || [];
    if (!activeSubjectId && subjects.length > 0) {
      setActiveSubjectId(subjects[0].subjectId);
    }
  }, [activeSubjectId, subjectsApi.data]);

  // Reset to the first page whenever the active subject changes.
  useEffect(() => {
    setPage(1);
  }, [activeSubjectId]);

  // Poll ingestion status for any 'processing' materials.
  const processingIds = materials.filter((m) => m.status === 'processing').map((m) => m.id);
  useEffect(() => {
    if (!processingIds.length) return undefined;
    const timer = setInterval(async () => {
      try {
        const statuses = await Promise.all(processingIds.map(getMaterialStatus));
        if (statuses.some((s) => s.status !== 'processing')) materialsApi.reload();
      } catch {
        // transient poll failure — keep polling
      }
    }, 4000);
    return () => clearInterval(timer);
  }, [processingIds.join(','), materialsApi.reload]);

  function isFileSupported(file) {
    const ext = file.name.split('.').pop()?.toLowerCase();
    return ALLOWED_EXTENSIONS.includes(ext);
  }

  function openDialog() {
    setUploadError(null);
    setRejectionMsg(null);
    setSelectedFile(null);
    setTargetSubjectId(activeSubjectId);
    setDialogOpen(true);
  }

  function handleFileInput(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!isFileSupported(file)) {
      setRejectionMsg(`Unsupported file: ${file.name}. Only ${SUPPORTED_FORMATS} are supported.`);
      setSelectedFile(null);
      return;
    }
    setRejectionMsg(null);
    setSelectedFile(file);
  }

  async function handleUpload() {
    if (!selectedFile || !targetSubjectId || uploading) return;
    setUploading(true);
    setUploadError(null);
    try {
      await uploadMaterial({ subjectId: targetSubjectId, file: selectedFile });
      setDialogOpen(false);
      setSelectedFile(null);
      materialsApi.reload();
    } catch (err) {
      setUploadError(err);
    } finally {
      setUploading(false);
    }
  }

  async function handleRetry(mat) {
    try {
      await retryMaterial(mat.id);
      materialsApi.reload();
    } catch (err) {
      setRejectionMsg(`Could not retry: ${err.message}`);
    }
  }

  async function handleDelete(mat) {
    const ok = window.confirm(`Delete "${mat.name}"? This removes it for all students.`);
    if (!ok) return;
    try {
      await deleteMaterial(mat.id);
      materialsApi.reload();
    } catch (err) {
      setRejectionMsg(`Could not delete: ${err.message}`);
    }
  }

  async function handleDownload(mat) {
    // Open the target window synchronously so the popup isn't blocked after the await.
    const win = window.open('', '_blank');
    try {
      const { url } = await getMaterialDownloadUrl(mat.id);
      if (win) win.location.href = url;
    } catch (err) {
      win?.close();
      setRejectionMsg(`Could not download: ${err.message}`);
    }
  }

  if (subjectsApi.loading || (!subjectsApi.data && materialsApi.loading)) {
    return (
      <AppLayout role="teacher">
        <LoadingState label="Loading materials…" />
      </AppLayout>
    );
  }

  const pageError = subjectsApi.error || materialsApi.error;
  if (pageError) {
    return (
      <AppLayout role="teacher">
        <ErrorState
          message={pageError.message}
          onRetry={() => (subjectsApi.error ? subjectsApi.reload() : materialsApi.reload())}
        />
      </AppLayout>
    );
  }

  const subjects = subjectsApi.data || [];

  return (
    <AppLayout role="teacher">
      <header className="mb-sp-xl">
        <h1 className="font-headline-lg text-headline-lg text-on-background">Resources & Materials</h1>
        <p className="font-body-md text-body-md text-secondary mt-1">
          Upload and manage materials. Co-teacher materials are visible but read-only.
        </p>
      </header>

      {/* Subject tabs */}
      {subjects.length > 0 && (
        <div className="flex items-center gap-sp-xs border-b border-surface-container-high mb-sp-lg flex-wrap">
          {subjects.map((subj) => (
            <button
              key={subj.subjectId}
              onClick={() => setActiveSubjectId(subj.subjectId)}
              className={cn(
                'px-sp-md py-sp-sm rounded-t-xl font-label-md text-label-md transition-all',
                activeSubjectId === subj.subjectId
                  ? 'text-primary bg-primary-fixed/30 border-b-4 border-primary -mb-px'
                  : 'text-on-surface-variant hover:bg-surface-container-low'
              )}
            >
              {subj.name}
            </button>
          ))}
        </div>
      )}

      {rejectionMsg && (
        <div role="alert" className="mb-sp-md p-sp-md bg-error-container text-error rounded-2xl flex items-center justify-between font-label-md">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px]">error</span>
            <span>{rejectionMsg}</span>
          </div>
          <button type="button" onClick={() => setRejectionMsg(null)} aria-label="Dismiss error" className="hover:opacity-75">
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">close</span>
          </button>
        </div>
      )}

      {/* Upload Zone */}
      <section className="mb-sp-xl">
        <div
          role={subjects.length === 0 ? undefined : 'button'}
          tabIndex={subjects.length === 0 ? undefined : 0}
          onClick={subjects.length === 0 ? undefined : openDialog}
          onKeyDown={
            subjects.length === 0
              ? undefined
              : (e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    openDialog();
                  }
                }
          }
          className={cn(
            'border-2 border-dashed rounded-3xl p-sp-xl flex flex-col items-center justify-center text-center transition-all duration-200',
            subjects.length === 0
              ? 'border-outline-variant bg-surface-container-low cursor-not-allowed'
              : 'cursor-pointer border-outline-variant bg-white hover:border-primary/50 hover:bg-primary-fixed/5'
          )}
        >
          <span className="material-symbols-outlined text-[48px] mb-sp-md text-secondary">cloud_upload</span>
          <p className="font-headline-md text-headline-md text-on-background mb-1">
            {subjects.length === 0 ? 'Uploads are unavailable yet' : 'Click to upload materials'}
          </p>
          <p className="font-body-md text-body-md text-secondary">
            {subjects.length === 0
              ? "You aren't assigned to any subjects. Ask an administrator to assign you before uploading."
              : `${SUPPORTED_FORMATS} supported — you'll pick the subject next`}
          </p>
        </div>
      </section>

      {/* Materials Table */}
      <section>
        <SectionHeader title={`All Materials (${totalMaterials})`} />
        {materials.length === 0 ? (
          <EmptyState
            icon="folder_off"
            title="No materials yet"
            description="Upload your first material to make it available to students."
          />
        ) : (
          <div className="bg-white rounded-2xl ambient-shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-surface-container-high bg-surface-container-low/50">
                    {['File', 'Subject', 'Owner', 'Status', 'Uploaded', ''].map((col) => (
                      <th key={col} className="px-sp-md py-sp-sm font-label-sm text-label-sm text-on-surface-variant">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-high">
                  {materials.map((mat) => {
                    const typeConfig = getTypeConfig(mat.fileType);
                    const isOwn = mat.teacherId === user?.id;
                    const badge = STATUS_BADGE[mat.status] ?? { label: mat.status || 'Unknown', cls: 'bg-surface-container-high text-on-surface-variant' };
                    const subjectName = subjects.find((s) => s.subjectId === mat.subjectId)?.name || 'Unknown';
                    return (
                      <tr key={mat.id} className="hover:bg-surface-container-low transition-colors group">
                        {/* File */}
                        <td className="px-sp-md py-sp-md">
                          <div className="flex items-center gap-3">
                            <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', typeConfig.bg)}>
                              <span className={cn('material-symbols-outlined text-[18px]', typeConfig.color)}>{typeConfig.icon}</span>
                            </div>
                            <span className="font-label-md text-label-md text-on-surface max-w-[200px] truncate">{mat.name}</span>
                          </div>
                        </td>
                        <td className="px-sp-md py-sp-md font-body-md text-body-md text-on-surface-variant">{subjectName}</td>
                        {/* Owner column — key for collaborative/co-teacher visibility */}
                        <td className="px-sp-md py-sp-md">
                          <span className={cn('font-label-md text-label-md', isOwn ? 'text-primary font-semibold' : 'text-on-surface-variant')}>
                            {isOwn ? 'You' : mat.teacherName || 'Unknown'}
                          </span>
                        </td>
                        <td className="px-sp-md py-sp-md">
                          <span className={cn('px-2 py-0.5 rounded-full text-[11px] font-bold', badge.cls)}>{badge.label}</span>
                        </td>
                        <td className="px-sp-md py-sp-md font-label-sm text-label-sm text-secondary">{formatDate(mat.uploadedAt, { withYear: true })}</td>
                        <td className="px-sp-md py-sp-md text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                            {mat.status === 'ready' && (
                              <button
                                onClick={() => handleDownload(mat)}
                                title="Download"
                                aria-label={`Download ${mat.name}`}
                                className="p-sp-xs rounded-lg hover:bg-surface-container text-outline hover:text-primary transition-colors"
                              >
                                <span className="material-symbols-outlined text-[18px]">download</span>
                              </button>
                            )}
                            {mat.status === 'failed' && (
                              <button
                                onClick={() => handleRetry(mat)}
                                title="Retry ingestion"
                                aria-label={`Retry ${mat.name}`}
                                className="p-sp-xs rounded-lg hover:bg-surface-container text-outline hover:text-primary transition-colors"
                              >
                                <span className="material-symbols-outlined text-[18px]">refresh</span>
                              </button>
                            )}
                            {isOwn && (
                              <button
                                onClick={() => handleDelete(mat)}
                                title="Delete"
                                aria-label={`Delete ${mat.name}`}
                                className="p-sp-xs rounded-lg hover:bg-error-container text-outline hover:text-error transition-colors"
                              >
                                <span className="material-symbols-outlined text-[18px]">delete</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
              summary={`Showing ${materials.length} of ${totalMaterials} materials`}
            />
          </div>
        )}
      </section>

      {/* Upload dialog — pick subject + file */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Material</DialogTitle>
          </DialogHeader>

          <p className="font-label-sm text-label-sm text-secondary uppercase tracking-wider mb-sp-sm">Subject</p>
          <div className="flex items-center gap-2 flex-wrap mb-sp-md">
            {subjects.map((subj) => (
              <button
                key={subj.subjectId}
                onClick={() => setTargetSubjectId(subj.subjectId)}
                className={cn(
                  'px-3 py-1 rounded-full font-label-md text-label-md transition-all',
                  targetSubjectId === subj.subjectId
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container-low text-secondary hover:bg-primary-fixed'
                )}
              >
                {subj.name}
              </button>
            ))}
          </div>

          <label
            className={cn(
              'block border-2 border-dashed rounded-2xl p-sp-md text-center cursor-pointer transition-colors',
              selectedFile ? 'border-tertiary bg-tertiary-fixed/20' : 'border-outline-variant hover:border-primary/50'
            )}
          >
            <input ref={fileInputRef} type="file" accept={ACCEPTED_FORMATS} className="hidden" onChange={handleFileInput} />
            {selectedFile ? (
              <span className="font-label-md text-label-md text-tertiary font-semibold">{selectedFile.name}</span>
            ) : (
              <span className="font-label-md text-label-md text-secondary">Click to choose a file ({SUPPORTED_FORMATS})</span>
            )}
          </label>

          {uploadError && <p className="text-error font-label-sm text-label-sm mt-2">{uploadError.message}</p>}

          <DialogFooter>
            <button
              onClick={() => setDialogOpen(false)}
              className="h-9 px-4 rounded-lg border border-outline-variant text-secondary font-label-md text-label-md hover:bg-surface-container-low transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleUpload}
              disabled={!selectedFile || !targetSubjectId || uploading}
              className="h-9 px-6 rounded-lg bg-primary text-on-primary font-label-md text-label-md hover:scale-[0.98] transition-all disabled:opacity-40"
            >
              {uploading ? 'Uploading…' : 'Upload'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
