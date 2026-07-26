import React, { useState, useRef } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { SectionHeader } from '@/components/ui/shared';
import { cn } from '@/lib/utils';
import { getTypeConfig } from '@/lib/materials';

// --- Mock data (replace with GET /materials?owned=true and GET /materials?subject=X when backend is ready) ---
const INITIAL_MATERIALS = [
  {
    id: 'm1',
    name: 'Week 1 — Arrays & Complexity.pdf',
    subject: 'Data Structures',
    owner: 'You',
    ownerId: 'me',
    type: 'PDF',
    size: '1.2 MB',
    uploadedAt: '2026-07-10',
  },
  {
    id: 'm2',
    name: 'Graph Algorithms — Lecture Notes.pdf',
    subject: 'Data Structures',
    owner: 'Dr. Priya Nair',
    ownerId: 't2',
    type: 'PDF',
    size: '854 KB',
    uploadedAt: '2026-07-12',
  },
  {
    id: 'm3',
    name: 'Macroeconomic Theory Ch1.pdf',
    subject: 'Macroeconomics',
    owner: 'You',
    ownerId: 'me',
    type: 'PDF',
    size: '2.1 MB',
    uploadedAt: '2026-07-15',
  },
];

export default function TeacherMaterials() {
  const [materials, setMaterials] = useState(INITIAL_MATERIALS);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  function handleFiles(files) {
    if (!files?.length) return;
    setUploading(true);
    // Simulate upload delay — replace with POST /materials (multipart) when backend is ready
    setTimeout(() => {
      const newMats = Array.from(files).map((f, i) => ({
        id: `upload-${Date.now()}-${i}`,
        name: f.name,
        subject: 'Unassigned', // TODO: subject picker after upload
        owner: 'You',
        ownerId: 'me',
        type: f.name.split('.').pop().toUpperCase(),
        size: f.size > 1024 * 1024 ? `${(f.size / 1024 / 1024).toFixed(1)} MB` : `${Math.round(f.size / 1024)} KB`,
        uploadedAt: new Date().toISOString().slice(0, 10),
      }));
      setMaterials((prev) => [...newMats, ...prev]);
      setUploading(false);
    }, 1000);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  }

  function deleteMaterial(id) {
    // Only allow deleting own materials (ownerId === 'me')
    setMaterials((prev) => prev.filter((m) => m.id !== id));
    // TODO: DELETE /materials/:id when backend is ready
  }

  return (
    <AppLayout role="teacher">
      <header className="mb-xl">
        <h1 className="font-headline-lg text-headline-lg text-on-background">Resources & Materials</h1>
        <p className="font-body-md text-body-md text-secondary mt-1">
          Upload and manage materials. Co-teacher materials are visible but read-only.
        </p>
      </header>

      {/* Upload Zone */}
      <section className="mb-xl">
        <div
          onDragEnter={(e) => { e.preventDefault(); setDragging(true); }}
          onDragOver={(e) => e.preventDefault()}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            'border-2 border-dashed rounded-3xl p-xl flex flex-col items-center justify-center cursor-pointer transition-all duration-200 text-center',
            dragging ? 'border-primary bg-primary-fixed/20' : 'border-outline-variant bg-white hover:border-primary/50 hover:bg-primary-fixed/5'
          )}
        >
          <span className={cn('material-symbols-outlined text-[48px] mb-md', dragging ? 'text-primary' : 'text-secondary')}>
            cloud_upload
          </span>
          {uploading ? (
            <p className="font-label-md text-label-md text-primary">Uploading…</p>
          ) : (
            <>
              <p className="font-headline-md text-headline-md text-on-background mb-1">Drop files here to upload</p>
              <p className="font-body-md text-body-md text-secondary">or click to browse — PDF, DOCX, PPTX supported</p>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.ppt,.pptx"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>
      </section>

      {/* Materials Table */}
      <section>
        <SectionHeader title={`All Materials (${materials.length})`} />
        <div className="bg-white rounded-2xl ambient-shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-surface-container-high bg-surface-container-low/50">
                  {['File', 'Subject', 'Owner', 'Size', 'Uploaded', ''].map((col) => (
                    <th key={col} className="px-md py-sm font-label-sm text-label-sm text-on-surface-variant">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-high">
                {materials.map((mat) => {
                  const typeConfig = getTypeConfig(mat.type);
                  const isOwn = mat.ownerId === 'me';
                  return (
                    <tr key={mat.id} className="hover:bg-surface-container-low transition-colors group">
                      {/* File */}
                      <td className="px-md py-md">
                        <div className="flex items-center gap-3">
                          <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', typeConfig.bg)}>
                            <span className={cn('material-symbols-outlined text-[18px]', typeConfig.color)}>{typeConfig.icon}</span>
                          </div>
                          <span className="font-label-md text-label-md text-on-surface max-w-[200px] truncate">{mat.name}</span>
                        </div>
                      </td>
                      <td className="px-md py-md font-body-md text-body-md text-on-surface-variant">{mat.subject}</td>
                      {/* Owner column — key for collaborative/co-teacher visibility */}
                      <td className="px-md py-md">
                        <span className={cn('font-label-md text-label-md', isOwn ? 'text-primary font-semibold' : 'text-on-surface-variant')}>
                          {mat.owner}
                        </span>
                      </td>
                      <td className="px-md py-md font-label-sm text-label-sm text-secondary">{mat.size}</td>
                      <td className="px-md py-md font-label-sm text-label-sm text-secondary">{mat.uploadedAt}</td>
                      <td className="px-md py-md text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {isOwn && (
                            <button
                              onClick={() => deleteMaterial(mat.id)}
                              title="Delete"
                              className="p-xs rounded-lg hover:bg-error-container text-outline hover:text-error transition-colors"
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
        </div>
      </section>
    </AppLayout>
  );
}
