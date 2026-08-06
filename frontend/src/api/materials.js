import { request } from './client';
import { mapMaterial, mapMaterialsList } from './subjects';

/**
 * GET /api/materials — teacher-side material list. `subject_id` is required
 * for the teacher view (own + co-teacher materials on a shared subject);
 * own-vs-co-teacher is derived client-side from teacher_id === user.id.
 */
export async function listMaterials({ subjectId, teacherId, status, search, page, size } = {}) {
  const data = await request('/api/materials', {
    params: { subject_id: subjectId, teacher_id: teacherId, status, search, page, size },
  });
  return mapMaterialsList(data);
}

/** POST /api/materials (multipart) — triggers the ingestion pipeline. */
export async function uploadMaterial({ subjectId, file }) {
  const formData = new FormData();
  formData.append('subject_id', subjectId);
  formData.append('file', file);
  const data = await request('/api/materials', { method: 'POST', formData });
  return mapMaterial(data);
}

/** GET /api/materials/:id/status — poll for processing → ready/failed. */
export async function getMaterialStatus(id) {
  const data = await request(`/api/materials/${id}/status`);
  return {
    id: data.id,
    status: data.status,
    ingestionVersion: data.ingestion_version,
    processedAt: data.processed_at ?? null,
  };
}

/** GET /api/materials/:id/download → presigned URL. */
export async function getMaterialDownloadUrl(id) {
  const data = await request(`/api/materials/${id}/download`);
  return { url: data.url, expiresIn: data.expires_in ?? 300 };
}

/** POST /api/materials/:id/retry — re-run ingestion for a failed material. */
export async function retryMaterial(id) {
  const data = await request(`/api/materials/${id}/retry`, { method: 'POST' });
  return mapMaterial(data);
}

/** DELETE /api/materials/:id — owning teacher only. */
export async function deleteMaterial(id) {
  return request(`/api/materials/${id}`, { method: 'DELETE' });
}

/** PATCH /api/materials/:id — display_name / notes only. */
export async function updateMaterial(id, { displayName, notes } = {}) {
  const body = {};
  if (displayName !== undefined) body.display_name = displayName;
  if (notes !== undefined) body.notes = notes;
  const data = await request(`/api/materials/${id}`, { method: 'PATCH', body });
  return mapMaterial(data);
}
