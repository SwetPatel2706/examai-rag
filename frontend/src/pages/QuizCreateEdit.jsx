import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import { LoadingState, EmptyState, ErrorState } from '@/components/ui/states';
import { cn } from '@/lib/utils';
import { useApi } from '@/lib/useApi';
import { getTeacherSubjects } from '@/api/analytics';
import {
  listQuizzes,
  getQuiz,
  createQuiz,
  updateQuiz,
  deleteQuiz,
  publishQuiz,
  generateQuiz,
} from '@/api/quizzes';
import { listMaterials } from '@/api/materials';

const BLANK_QUESTION = () => ({
  id: `q-${Date.now()}-${Math.random()}`,
  stem: '',
  options: ['', '', '', ''],
  correct: 0,
});

function QuestionEditor({ question, index, onChange, onDelete }) {
  return (
    <div className="bg-white rounded-2xl border border-outline-variant p-sp-md space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider">Question {index + 1}</span>
        <button
          onClick={onDelete}
          className="p-sp-xs rounded-lg hover:bg-error-container text-outline hover:text-error transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">delete</span>
        </button>
      </div>

      {/* Question stem */}
      <textarea
        className="w-full resize-none border border-outline-variant rounded-xl px-3 py-2 font-body-md text-body-md outline-none focus:border-primary transition-colors min-h-[60px]"
        placeholder="Enter question…"
        value={question.stem}
        onChange={(e) => onChange({ ...question, stem: e.target.value })}
        rows={2}
      />

      {/* Options */}
      <div className="space-y-2">
        {question.options.map((opt, oi) => (
          <div key={oi} className="flex items-center gap-2">
            <button
              onClick={() => onChange({ ...question, correct: oi })}
              className={cn(
                'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all',
                question.correct === oi ? 'border-primary bg-primary' : 'border-outline-variant hover:border-primary/60'
              )}
            >
              {question.correct === oi && (
                <span className="material-symbols-outlined text-on-primary text-[12px]">check</span>
              )}
            </button>
            <input
              type="text"
              className="flex-1 border border-outline-variant rounded-lg px-3 py-1.5 font-label-md text-label-md outline-none focus:border-primary transition-colors"
              placeholder={`Option ${String.fromCharCode(65 + oi)}`}
              value={opt}
              onChange={(e) => {
                const opts = [...question.options];
                opts[oi] = e.target.value;
                onChange({ ...question, options: opts });
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

const STATUS_BADGE = {
  draft: { label: 'Draft', cls: 'bg-surface-container-high text-on-surface-variant' },
  published: { label: 'Published', cls: 'bg-tertiary-fixed/30 text-tertiary' },
};

export default function QuizCreateEdit() {
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [mode, setMode] = useState('manual'); // 'manual' | 'ai'
  const [title, setTitle] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [questions, setQuestions] = useState(() => [BLANK_QUESTION()]);
  const [selectedMats, setSelectedMats] = useState(new Set());
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState(null);

  const subjectsApi = useApi(getTeacherSubjects, []);
  const quizzesApi = useApi(listQuizzes, []);

  // Ready materials for AI generation, scoped to the selected subject.
  const materialsApi = useApi(
    () => (subjectId ? listMaterials({ subjectId, size: 100 }) : Promise.resolve({ items: [], total: 0 })),
    [subjectId]
  );
  const readyMaterials = (materialsApi.data?.items || []).filter((m) => m.status === 'ready');

  useEffect(() => {
    setSelectedMats(new Set());
  }, [subjectId]);

  function openCreate() {
    setFormOpen(true);
    setEditingId(null);
    setMode('manual');
    setTitle('');
    setSubjectId(subjectsApi.data?.[0]?.subjectId ?? '');
    setQuestions([BLANK_QUESTION()]);
    setSelectedMats(new Set());
    setActionError(null);
  }

  async function openEdit(quizId) {
    setActionError(null);
    try {
      const quiz = await getQuiz(quizId);
      setFormOpen(true);
      setEditingId(quizId);
      setMode('manual');
      setTitle(quiz.topic);
      setSubjectId(quiz.subjectId);
      setQuestions(
        quiz.questions.map((q) => ({
          id: `edit-${q.id}`,
          stem: q.stem,
          options: [...q.options],
          correct: Math.max(0, q.options.indexOf(q.correct)),
        }))
      );
    } catch (err) {
      setActionError(err);
    }
  }

  function cancelForm() {
    setFormOpen(false);
    setEditingId(null);
    setActionError(null);
  }

  function addQuestion() {
    setQuestions((prev) => [...prev, BLANK_QUESTION()]);
  }

  function updateQuestion(index, updated) {
    setQuestions((prev) => prev.map((q, i) => (i === index ? updated : q)));
  }

  function deleteQuestion(index) {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  }

  function toggleMaterial(id) {
    setSelectedMats((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function runAIGenerate() {
    if (!selectedMats.size || generating) return;
    setGenerating(true);
    setActionError(null);
    try {
      const drafts = await generateQuiz({
        subjectId,
        materialIds: [...selectedMats],
        topic: title.trim() || 'Untitled Quiz',
        questionCount: 10,
      });
      setQuestions((prev) => [
        ...prev.filter((q) => q.stem.trim()),
        ...drafts.map((d, i) => ({
          id: `ai-${Date.now()}-${i}`,
          stem: d.stem,
          options: [...d.options],
          correct: Math.max(0, d.options.indexOf(d.correct)),
        })),
      ]);
      setMode('manual');
    } catch (err) {
      setActionError(err);
    } finally {
      setGenerating(false);
    }
  }

  async function saveDraft() {
    await persist(false);
  }

  async function publish() {
    await persist(true);
  }

  async function persist(publishNow) {
    const cleanQuestions = questions.filter((q) => q.stem.trim());
    if (!cleanQuestions.length) {
      setActionError({ message: 'Add at least one question before saving.' });
      return;
    }
    setSaving(true);
    setActionError(null);
    try {
      let id = editingId;
      if (id) {
        await updateQuiz(id, { topic: title.trim(), questions: cleanQuestions });
      } else {
        id = await createQuiz({
          subjectId,
          topic: title.trim(),
          source: 'manual',
          questions: cleanQuestions,
        });
      }
      if (publishNow) await publishQuiz(id);
      cancelForm();
      quizzesApi.reload();
    } catch (err) {
      setActionError(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(quizId) {
    const ok = window.confirm('Delete this quiz and all its attempts?');
    if (!ok) return;
    try {
      await deleteQuiz(quizId);
      quizzesApi.reload();
    } catch (err) {
      setActionError(err);
    }
  }

  if (subjectsApi.loading || quizzesApi.loading) {
    return (
      <AppLayout role="teacher">
        <LoadingState label="Loading quizzes…" />
      </AppLayout>
    );
  }

  if (subjectsApi.error || quizzesApi.error) {
    return (
      <AppLayout role="teacher">
        <ErrorState
          message={subjectsApi.error?.message || quizzesApi.error?.message}
          onRetry={() => (subjectsApi.error ? subjectsApi.reload() : quizzesApi.reload())}
        />
      </AppLayout>
    );
  }

  const subjects = subjectsApi.data || [];
  const quizzes = quizzesApi.data || [];

  return (
    <AppLayout role="teacher">
      <header className="mb-sp-lg flex items-start justify-between">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-background">
            {formOpen ? (editingId ? 'Edit Quiz' : 'Create Quiz') : 'Quizzes'}
          </h1>
          <p className="font-body-md text-body-md text-secondary mt-1">
            {formOpen
              ? 'Author manually or generate a draft from your uploaded materials.'
              : 'All students in a subject take the same published quiz.'}
          </p>
        </div>
        {!formOpen && (
          <button
            onClick={openCreate}
            className="h-10 px-6 bg-primary text-on-primary rounded-full font-label-md text-label-md flex items-center gap-2 hover:scale-95 transition-all duration-150 shadow-md shrink-0"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Create Quiz
          </button>
        )}
      </header>

      {actionError && (
        <div role="alert" className="mb-sp-md p-sp-md bg-error-container text-error rounded-2xl flex items-center justify-between font-label-md">
          <span>{actionError.message}</span>
          <button onClick={() => setActionError(null)} className="hover:opacity-75" aria-label="Dismiss error">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      )}

      {!formOpen ? (
        /* ── Quiz list (teacher view) ── */
        quizzes.length === 0 ? (
          <EmptyState
            icon="quiz"
            title="No quizzes yet"
            description="Create your first quiz manually or with AI assistance."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-gutter">
            {quizzes.map((quiz) => {
              const badge = STATUS_BADGE[quiz.status] ?? STATUS_BADGE.draft;
              const subjectName = subjects.find((s) => s.subjectId === quiz.subjectId)?.name || 'Unknown';
              return (
                <div key={quiz.id} className="bg-white rounded-2xl ambient-shadow card-hover p-sp-md flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider">{subjectName}</span>
                    <span className={cn('px-2 py-0.5 rounded-full text-[11px] font-bold', badge.cls)}>{badge.label}</span>
                  </div>
                  <h3 className="font-headline-md text-[18px] text-on-background">{quiz.topic}</h3>
                  <div className="flex items-center gap-4 text-secondary font-label-sm text-label-sm">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">help_outline</span>
                      {quiz.questionCount} questions
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">source</span>
                      {quiz.source === 'ai_generated' ? 'AI' : 'Manual'}
                    </span>
                  </div>
                  <div className="flex gap-2 mt-auto pt-1">
                    <button
                      onClick={() => openEdit(quiz.id)}
                      className="flex-1 h-9 rounded-lg border border-outline-variant text-secondary font-label-md text-label-md hover:bg-surface-container-low transition-colors"
                    >
                      Edit
                    </button>
                    {quiz.status === 'draft' && (
                      <button
                        onClick={() => publishQuiz(quiz.id).then(() => quizzesApi.reload())}
                        className="flex-1 h-9 rounded-lg bg-primary text-on-primary font-label-md text-label-md hover:scale-[0.98] transition-all"
                      >
                        Publish
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(quiz.id)}
                      className="p-2 rounded-lg text-outline hover:text-error hover:bg-error-container transition-colors"
                      aria-label={`Delete ${quiz.topic}`}
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        /* ── Create/Edit form ── */
        <>
          {/* Quiz meta */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-sp-md mb-sp-lg">
            <div>
              <label className="font-label-sm text-label-sm text-secondary uppercase tracking-wider block mb-1">Quiz Title</label>
              <input
                type="text"
                className="w-full border border-outline-variant rounded-xl px-sp-md py-sp-sm font-body-md text-body-md outline-none focus:border-primary transition-colors"
                placeholder="e.g. Sorting Algorithms Quiz"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="font-label-sm text-label-sm text-secondary uppercase tracking-wider block mb-1">Subject</label>
              <select
                className="w-full border border-outline-variant rounded-xl px-sp-md py-sp-sm font-body-md text-body-md outline-none focus:border-primary transition-colors bg-white"
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
              >
                {subjects.map((s) => (
                  <option key={s.subjectId} value={s.subjectId}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Mode tabs */}
          <div className="flex gap-2 border-b border-outline-variant mb-sp-lg">
            {[
              { id: 'manual', label: 'Manual', icon: 'edit' },
              { id: 'ai', label: 'AI-Assisted', icon: 'auto_awesome' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setMode(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-sp-md py-sp-sm rounded-t-xl font-label-md text-label-md transition-all -mb-px',
                  mode === tab.id
                    ? 'text-primary bg-primary-fixed/30 border-b-2 border-primary'
                    : 'text-secondary hover:bg-surface-container-low'
                )}
              >
                <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-sp-lg">
            {/* Questions panel */}
            <div className="lg:col-span-2 space-y-sp-md">
              {mode === 'ai' ? (
                <div className="bg-white rounded-2xl p-sp-md border border-outline-variant space-y-sp-md">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                    <h3 className="font-headline-md text-headline-md text-on-background">AI-Assisted Generation</h3>
                  </div>
                  <p className="font-body-md text-body-md text-secondary">
                    Select your uploaded materials on the right. ExamAI will generate a draft quiz — then switch to Manual mode to review and edit.
                  </p>
                  <button
                    onClick={runAIGenerate}
                    disabled={!selectedMats.size || generating}
                    className="h-12 px-8 bg-primary text-on-primary rounded-xl font-label-md text-label-md hover:scale-[0.98] transition-all disabled:opacity-40 flex items-center gap-2"
                  >
                    {generating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
                        Generating…
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
                        Generate Draft ({selectedMats.size} material{selectedMats.size !== 1 ? 's' : ''})
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <>
                  {questions.map((q, i) => (
                    <QuestionEditor
                      key={q.id}
                      question={q}
                      index={i}
                      onChange={(updated) => updateQuestion(i, updated)}
                      onDelete={() => deleteQuestion(i)}
                    />
                  ))}
                  <button
                    onClick={addQuestion}
                    className="w-full h-12 rounded-2xl border-2 border-dashed border-outline-variant text-secondary font-label-md text-label-md hover:border-primary hover:text-primary transition-all flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined">add</span>
                    Add Question
                  </button>
                </>
              )}
            </div>

            {/* Materials selector for AI mode */}
            <div>
              <h3 className="font-label-md text-label-md font-bold uppercase tracking-wider text-secondary mb-sp-md">Source Materials</h3>
              <div className="bg-white rounded-2xl border border-outline-variant p-sp-md space-y-2">
                {materialsApi.loading ? (
                  <p className="text-secondary font-label-sm text-label-sm py-2">Loading materials…</p>
                ) : materialsApi.error ? (
                  <ErrorState message={materialsApi.error.message} onRetry={materialsApi.reload} />
                ) : readyMaterials.length === 0 ? (
                  <p className="text-on-surface-variant font-label-sm text-label-sm py-2">
                    No ready materials for this subject. Upload some in Resources first.
                  </p>
                ) : (
                  readyMaterials.map((mat) => (
                    <label key={mat.id} className="flex items-center gap-3 p-2 rounded-xl cursor-pointer hover:bg-surface-container-low transition-colors">
                      <input
                        type="checkbox"
                        className="accent-primary w-4 h-4 rounded"
                        checked={selectedMats.has(mat.id)}
                        onChange={() => toggleMaterial(mat.id)}
                      />
                      <div className="min-w-0">
                        <p className="font-label-md text-label-md text-on-surface truncate max-w-[180px]">{mat.name}</p>
                        <p className="text-[11px] text-secondary uppercase">{mat.fileType}</p>
                      </div>
                    </label>
                  ))
                )}
              </div>
              <p className="font-label-sm text-label-sm text-secondary mt-2 text-center">
                {mode === 'ai' ? 'Select materials to generate from' : 'Materials used for AI generation'}
              </p>
            </div>
          </div>

          {/* Form actions */}
          <div className="flex justify-end gap-3 mt-sp-lg">
            <button
              onClick={cancelForm}
              disabled={saving}
              className="h-10 px-5 rounded-xl border border-outline-variant text-secondary font-label-md text-label-md hover:bg-surface-container-low transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={saveDraft}
              disabled={saving}
              className="h-10 px-5 rounded-xl border border-outline-variant text-secondary font-label-md text-label-md hover:bg-surface-container-low transition-colors"
            >
              {editingId ? 'Save' : 'Save Draft'}
            </button>
            <button
              onClick={publish}
              disabled={saving}
              className="h-10 px-5 rounded-xl bg-primary text-on-primary font-label-md text-label-md hover:scale-[0.98] transition-all"
            >
              {saving ? 'Saving…' : 'Publish'}
            </button>
          </div>
        </>
      )}
    </AppLayout>
  );
}
