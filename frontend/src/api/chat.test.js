import { describe, it, expect, vi, afterEach } from 'vitest';
import { askQuestion } from './chat';

function jsonResponse(payload, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => payload };
}

afterEach(() => vi.unstubAllGlobals());

describe('askQuestion()', () => {
  it('posts subject + selected material ids and maps the RAG response', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        success: true,
        data: {
          answer_text: 'O(1). [1]',
          citations: [
            { marker: 1, teacher_name: 'Dr. Vance', material_filename: 'arrays.pdf', material_id: 'm1', source_locator: { type: 'page', value: 4 } },
          ],
        },
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    const res = await askQuestion({
      subjectId: 'sub-1',
      selectedMaterialIds: ['m1', 'm2'],
      question: 'Complexity?',
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain('/api/chat');
    expect(JSON.parse(init.body)).toEqual({
      subject_id: 'sub-1',
      selected_material_ids: ['m1', 'm2'],
      question: 'Complexity?',
    });

    expect(res.answerText).toBe('O(1). [1]');
    expect(res.citations).toEqual([
      { num: 1, teacherName: 'Dr. Vance', materialFilename: 'arrays.pdf', materialId: 'm1', sourceLocator: { type: 'page', value: 4 } },
    ]);
  });
});
