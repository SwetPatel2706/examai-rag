import React, { useState, useEffect, useRef } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { SectionHeader } from '@/components/ui/shared';
import { Pagination } from '@/components/ui/pagination';
import { EmptyState, ErrorState } from '@/components/ui/states';
import { MaterialsSkeleton } from '@/components/ui/skeletons';
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

const ALLOWED_EXTENSIONS = ['pdf', 'pptx', 'docx'];
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

  const subjectsApi = useApi(getTeacherSubjects, [], { key: ['teachers', 'me', 'subjects'], staleMs: 60_000 });

  const materialsApi = useApi(
    () => listMaterials({ subjectId: activeSubjectId, page, size: 100 }),
    [activeSubjectId, page],
    { key: ['materials', activeSubjectId, page], staleMs: 60_000, enabled: !!activeSubjectId }
  );
  const materials = materialsApi.data?.items || [];
  const totalMaterials = materialsApi.data?.total ?? 0;
  const totalPages = materialsApi.data?.pages || 1;
  const responsePages = materialsApi.data?.pages;

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

  useEffect(() => {
    if (responsePages === undefined) return;
    setPage((currentPage) => Math.min(currentPage, Math.max(responsePages, 1)));
  }, [responsePages]);

  // Poll ingestion status for any 'processing' materials.
  const processingIds = materials.filter((m) => m.status === 'processing').map((m) => m.id);
  const processingKey = processingIds.join(',');
  const { reload: reloadMaterials } = materialsApi;
  useEffect(() => {
    if (!processingKey) return undefined;
    const timer = setInterval(async () => {
      try {
        const ids = processingKey.split(',').filter(Boolean);
        const statuses = await Promise.all(ids.map(getMaterialStatus));
        if (statuses.some((s) => s.status !== 'processing')) reloadMaterials();
      } catch {
        // transient poll failure — keep polling
      }
    }, 4000);
    return () => clearInterval(timer);
  }, [processingKey, reloadMaterials]);

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
    setRejectionMsg(null);
    try {
      await retryMaterial(mat.id);
      materialsApi.reload();
    } catch (err) {
      setRejectionMsg(`Could not retry: ${err.message}`);
    }
  }

  async function handleDelete(mat) {
    setRejectionMsg(null);
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
    setRejectionMsg(null);
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
        <MaterialsSkeleton />
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
                <tbody className="divide-y divide-surface-container-high cv-auto">
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
        <DialogContent className="max-w-lg w-full">
          <DialogHeader>
            <DialogTitle>Upload Material</DialogTitle>
          </DialogHeader>

          {/* Subject selector */}
          <div className="space-y-1">
            <label
              htmlFor="upload-subject-select"
              className="font-label-sm text-label-sm text-secondary uppercase tracking-wider"
            >
              Subject
            </label>
            <select
              id="upload-subject-select"
              value={targetSubjectId ?? ''}
              onChange={(e) => setTargetSubjectId(e.target.value)}
              className="w-full h-10 rounded-xl border border-outline-variant bg-surface-container-low px-3 font-label-md text-label-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
            >
              {subjects.map((subj) => (
                <option key={subj.subjectId} value={subj.subjectId}>
                  {subj.name}
                </option>
              ))}
            </select>
          </div>

          {/* File picker */}
          <div className="space-y-1">
            <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider">
              File
            </span>
            <label
              className={cn(
                'flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-2xl py-6 px-sp-md text-center cursor-pointer transition-colors',
                selectedFile
                  ? 'border-tertiary bg-tertiary-fixed/20'
                  : 'border-outline-variant hover:border-primary/50 hover:bg-primary-fixed/5'
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_FORMATS}
                className="hidden"
                onChange={handleFileInput}
              />
              {selectedFile ? (
                <>
                  <span className="material-symbols-outlined text-[32px] text-tertiary">description</span>
                  <span className="font-label-md text-label-md text-tertiary font-semibold break-all max-w-xs">
                    {selectedFile.name}
                  </span>
                  <span className="font-body-sm text-body-sm text-secondary">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB — click to change
                  </span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[40px] text-secondary">cloud_upload</span>
                  <span className="font-label-md text-label-md text-on-surface">
                    Click to choose a file
                  </span>
                  <span className="font-body-sm text-body-sm text-secondary">
                    {SUPPORTED_FORMATS} supported
                  </span>
                </>
              )}
            </label>
          </div>

          {uploadError && (
            <div className="flex items-center gap-2 rounded-xl bg-error-container p-3">
              <span className="material-symbols-outlined text-[18px] text-error">error</span>
              <p className="text-error font-label-sm text-label-sm">{uploadError.message}</p>
            </div>
          )}

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
