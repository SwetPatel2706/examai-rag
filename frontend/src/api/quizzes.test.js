import { describe, it, expect, vi, afterEach } from 'vitest';
import { getQuiz, submitAttempt, listMyAttempts, createQuiz } from './quizzes';

function jsonResponse(payload, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => payload };
}

afterEach(() => vi.unstubAllGlobals());

describe('quiz API', () => {
  it('getQuiz maps snake_case questions without leaking correct answers', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({
          success: true,
          data: {
            id: 'q1',
            subject_id: 's1',
            topic: 'Arrays',
            status: 'published',
            time_limit_seconds: 600,
            questions: [
              { id: 'qq1', question_text: 'Access cost?', options: ['O(1)', 'O(n)'], topic_tag: 'complexity', difficulty: 'easy' },
            ],
          },
        })
      )
    );

    const quiz = await getQuiz('q1');
    expect(quiz.topic).toBe('Arrays');
    expect(quiz.timeLimitSeconds).toBe(600);
    expect(quiz.questions[0]).toMatchObject({ id: 'qq1', stem: 'Access cost?', options: ['O(1)', 'O(n)'] });
    expect(quiz.questions[0].correct).toBeNull();
  });

  it('submitAttempt sends option TEXT keyed by question id', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        success: true,
        data: {
          id: 'a1',
          quiz_id: 'q1',
          student_id: 'u1',
          quiz_title: 'Arrays',
          answers: { qq1: 'O(1)' },
          score: 100,
          correct_count: 1,
          total_questions: 1,
          weak_topics: [],
          submitted_at: '2026-08-06T10:00:00Z',
          questions: [{ question_id: 'qq1', question_text: 'x', options: ['O(1)', 'O(n)'], correct_option: 'O(1)', selected_option: 'O(1)', is_correct: true }],
        },
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    const attempt = await submitAttempt({ quizId: 'q1', answers: { qq1: 'O(1)' } });

    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ quiz_id: 'q1', answers: { qq1: 'O(1)' } });

    expect(attempt.score).toBe(100);
    expect(attempt.correctCount).toBe(1);
    expect(attempt.questions[0]).toMatchObject({ isCorrect: true, selected: 'O(1)', correct: 'O(1)' });
  });

  it('createQuiz resolves the 0-based correct index to the option text the backend grades on', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ success: true, data: { id: 'q-new' } }));
    vi.stubGlobal('fetch', fetchMock);

    await createQuiz({
      subjectId: 's1',
      topic: 'Arrays',
      questions: [{ stem: 'Access cost?', options: ['O(1)', 'O(n)'], correct: 0, topicTag: 'complexity', difficulty: 'easy' }],
    });

    const [, init] = fetchMock.mock.calls[0];
    expect(JSON.parse(init.body)).toEqual({
      subject_id: 's1',
      topic: 'Arrays',
      source: 'manual',
      time_limit_seconds: null,
      questions: [
        { question_text: 'Access cost?', options: ['O(1)', 'O(n)'], correct_option: 'O(1)', topic_tag: 'complexity', difficulty: 'easy' },
      ],
    });
  });

  it('listMyAttempts passes quiz_id filter and maps the paginated envelope', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        success: true,
        data: {
          items: [
            { id: 'a2', quiz_id: 'q2', student_id: 'u1', quiz_title: 'Sorting', answers: {}, score: 80, correct_count: 2, total_questions: 3, weak_topics: [], submitted_at: '2026-08-05T10:00:00Z', questions: [] },
          ],
          total: 1,
          page: 1,
          pages: 1,
          size: 100,
        },
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await listMyAttempts({ quizId: 'q2' });

    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain('/api/students/me/attempts?quiz_id=q2');
    expect(result.total).toBe(1);
    expect(result.pages).toBe(1);
    expect(result.items[0]).toMatchObject({ id: 'a2', quizId: 'q2', score: 80 });
  });
});
