import { request } from './client';

function mapSubject(s) {
  return { id: s.id, name: s.name };
}

/** GET /api/subjects — subjects the current user can access. */
export async function listSubjects() {
  const data = await request('/api/subjects');
  return (data || []).map(mapSubject);
}

/** GET /api/subjects/:id — subject detail with teacher roster. */
export async function getSubject(id) {
  const data = await request(`/api/subjects/${id}`);
  return {
    id: data.id,
    name: data.name,
    teachers: (data.teachers || []).map((t) => ({ id: t.id, name: t.name, email: t.email })),
  };
}

/**
 * GET /api/subjects/:id/materials — subject-scoped materials list.
 * Maps the raw MaterialResponse into the camelCase shape the UI consumes.
 */
export async function listSubjectMaterials(subjectId, { teacherId, status, search, page, size } = {}) {
  const data = await request(`/api/subjects/${subjectId}/materials`, {
    params: { teacher_id: teacherId, status, search, page, size },
  });
  return mapMaterialsList(data);
}

export function mapMaterial(m) {
  return {
    id: m.id,
    subjectId: m.subject_id,
    teacherId: m.teacher_id,
    teacherName: m.teacher_name ?? null,
    name: m.filename,
    fileType: (m.file_type || '').toUpperCase(),
    status: m.status,
    ingestionVersion: m.ingestion_version ?? 0,
    displayName: m.display_name ?? null,
    notes: m.notes ?? null,
    uploadedAt: m.uploaded_at,
    processedAt: m.processed_at ?? null,
  };
}

export function mapMaterialsList(data) {
  return {
    items: (data.items || []).map(mapMaterial),
    total: data.total ?? 0,
    page: data.page ?? 1,
    pages: data.pages ?? 0,
    size: data.size ?? 0,
  };
}
