import { request } from './client';

/** GET /api/admin/users — list teachers/students with optional role filter. */
export async function listAdminUsers({ role, search, page, size } = {}) {
  return request('/api/admin/users', { params: { role, search, page, size } });
}

/** POST /api/admin/users — create a teacher/student (Supabase + DB). */
export async function createAdminUser({ email, name, role, password }) {
  return request('/api/admin/users', { method: 'POST', body: { email, name, role, password } });
}

/** PATCH /api/admin/users/:id — rename or change role. */
export async function updateAdminUser(id, { name, role }) {
  return request(`/api/admin/users/${id}`, { method: 'PATCH', body: { name, role } });
}

/** DELETE /api/admin/users/:id */
export async function deleteAdminUser(id) {
  return request(`/api/admin/users/${id}`, { method: 'DELETE' });
}

/** GET /api/admin/users/:id/subjects — subjects the user teaches / is enrolled in. */
export async function getAdminUserSubjects(id) {
  return request(`/api/admin/users/${id}/subjects`);
}

/** GET /api/admin/subjects — all subjects. */
export async function listAdminSubjects() {
  return request('/api/admin/subjects');
}

/** POST /api/admin/subjects */
export async function createAdminSubject(name) {
  return request('/api/admin/subjects', { method: 'POST', body: { name } });
}

/** PATCH /api/admin/subjects/:id */
export async function updateAdminSubject(id, name) {
  return request(`/api/admin/subjects/${id}`, { method: 'PATCH', body: { name } });
}

/** DELETE /api/admin/subjects/:id */
export async function deleteAdminSubject(id) {
  return request(`/api/admin/subjects/${id}`, { method: 'DELETE' });
}

/** GET /api/admin/subjects/:id/members — assigned teachers + enrolled students. */
export async function getAdminSubjectMembers(id) {
  return request(`/api/admin/subjects/${id}/members`);
}

/** POST /api/admin/subjects/:id/teachers */
export async function assignTeacher(subjectId, teacherId) {
  return request(`/api/admin/subjects/${subjectId}/teachers`, {
    method: 'POST',
    body: { teacher_id: teacherId },
  });
}

/** DELETE /api/admin/subjects/:id/teachers/:teacherId */
export async function unassignTeacher(subjectId, teacherId) {
  return request(`/api/admin/subjects/${subjectId}/teachers/${teacherId}`, { method: 'DELETE' });
}

/** POST /api/admin/subjects/:id/students */
export async function enrollStudent(subjectId, studentId) {
  return request(`/api/admin/subjects/${subjectId}/students`, {
    method: 'POST',
    body: { student_id: studentId },
  });
}

/** DELETE /api/admin/subjects/:id/students/:studentId */
export async function unenrollStudent(subjectId, studentId) {
  return request(`/api/admin/subjects/${subjectId}/students/${studentId}`, { method: 'DELETE' });
}
