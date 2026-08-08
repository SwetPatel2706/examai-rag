import { request } from './client';

/**
 * POST /api/chat — scoped RAG answer.
 * Citations are mapped snake_case → camelCase so the existing Chat.jsx
 * renderer (tooltip + citation list) works unchanged.
 */
export async function askQuestion({ subjectId, selectedMaterialIds, question }) {
  const data = await request('/api/chat', {
    method: 'POST',
    body: {
      subject_id: subjectId,
      selected_material_ids: selectedMaterialIds,
      question,
    },
  });
  return {
    answerText: data.answer_text,
    citations: (data.citations || []).map((c) => ({
      num: c.marker,
      teacherName: c.teacher_name,
      materialFilename: c.material_filename,
      materialId: c.material_id,
      sourceLocator: c.source_locator ?? null,
    })),
  };
}
