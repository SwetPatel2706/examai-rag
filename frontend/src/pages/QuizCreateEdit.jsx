import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import { cn } from '@/lib/utils';

// --- Mock data (replace with GET /materials?owned=true when backend is ready) ---
const MATERIALS_FOR_GENERATION = [
  { id: 'm1', name: 'Week 1 — Arrays & Complexity.pdf', type: 'PDF' },
  { id: 'm2', name: 'Week 2 — Linked Lists.pdf', type: 'PDF' },
  { id: 'm3', name: 'Graph Algorithms.pdf', type: 'PDF' },
];

const BLANK_QUESTION = () => ({
  id: `q-${Date.now()}-${Math.random()}`,
  stem: '',
  options: ['', '', '', ''],
  correct: 0,
  points: 1,
});

// Simulated AI-generated draft — replace with POST /quiz/generate when backend is ready
const AI_DRAFT_QUESTIONS = [
  {
    id: 'ai-q1',
    stem: 'Which sorting algorithm has O(n log n) average-case complexity?',
    options: ['Bubble Sort', 'Merge Sort', 'Insertion Sort', 'Selection Sort'],
    correct: 1,
    points: 2,
  },
  {
    id: 'ai-q2',
    stem: 'In a min-heap, the minimum element is always at the:',
    options: ['Last leaf node', 'Root', 'Middle node', 'Any position'],
    correct: 1,
    points: 2,
  },
];

function QuestionEditor({ question, index, onChange, onDelete }) {
  return (
    <div className="bg-white rounded-2xl border border-outline-variant p-md space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider">Question {index + 1}</span>
        <button
          onClick={onDelete}
          className="p-xs rounded-lg hover:bg-error-container text-outline hover:text-error transition-colors"
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

      {/* Points */}
      <div className="flex items-center gap-2">
        <span className="font-label-sm text-label-sm text-secondary">Points:</span>
        <input
          type="number"
          min={1}
          max={10}
          className="w-16 border border-outline-variant rounded-lg px-2 py-1 font-label-md text-label-md outline-none focus:border-primary text-center"
          value={question.points}
          onChange={(e) => onChange({ ...question, points: Number(e.target.value) })}
        />
      </div>
    </div>
  );
}

export default function QuizCreateEdit() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('manual'); // 'manual' | 'ai'
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [questions, setQuestions] = useState([BLANK_QUESTION()]);
  const [selectedMats, setSelectedMats] = useState(new Set());
  const [generating, setGenerating] = useState(false);

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
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function runAIGenerate() {
    if (!selectedMats.size) return;
    setGenerating(true);
    // Simulate API call — replace with POST /quiz/generate { material_ids, subject } when backend is ready
    setTimeout(() => {
      setQuestions(AI_DRAFT_QUESTIONS.map((q) => ({ ...q, id: `${q.id}-${Date.now()}` })));
      setMode('manual'); // switch to manual for review/edit
      setGenerating(false);
    }, 1500);
  }

  function publish() {
    // TODO: POST /quizzes { title, subject, questions } when backend is ready
    navigate('/teacher');
  }

  return (
    <AppLayout role="teacher">
      <header className="mb-lg flex items-start justify-between">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-background">Create Quiz</h1>
          <p className="font-body-md text-body-md text-secondary mt-1">
            Author manually or generate a draft from your uploaded materials.
          </p>
        </div>
        <div className="flex gap-3 shrink-0">
          <button className="h-10 px-5 rounded-xl border border-outline-variant text-secondary font-label-md text-label-md hover:bg-surface-container-low transition-colors">
            Save Draft
          </button>
          <button
            onClick={publish}
            className="h-10 px-5 rounded-xl bg-primary text-on-primary font-label-md text-label-md hover:scale-[0.98] transition-all"
          >
            Publish
          </button>
        </div>
      </header>

      {/* Quiz meta */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-md mb-lg">
        <div>
          <label className="font-label-sm text-label-sm text-secondary uppercase tracking-wider block mb-1">Quiz Title</label>
          <input
            type="text"
            className="w-full border border-outline-variant rounded-xl px-md py-sm font-body-md text-body-md outline-none focus:border-primary transition-colors"
            placeholder="e.g. Sorting Algorithms Quiz"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div>
          <label className="font-label-sm text-label-sm text-secondary uppercase tracking-wider block mb-1">Subject</label>
          <select
            className="w-full border border-outline-variant rounded-xl px-md py-sm font-body-md text-body-md outline-none focus:border-primary transition-colors bg-white"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          >
            <option value="">Select subject…</option>
            <option value="Data Structures">Data Structures</option>
            <option value="Macroeconomics">Macroeconomics</option>
            <option value="Linear Algebra">Linear Algebra</option>
          </select>
        </div>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-2 border-b border-outline-variant mb-lg">
        {[
          { id: 'manual', label: 'Manual', icon: 'edit' },
          { id: 'ai', label: 'AI-Assisted', icon: 'auto_awesome' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setMode(tab.id)}
            className={cn(
              'flex items-center gap-2 px-md py-sm rounded-t-xl font-label-md text-label-md transition-all -mb-px',
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
        {/* Questions panel */}
        <div className="lg:col-span-2 space-y-md">
          {mode === 'ai' ? (
            /* AI generation panel */
            <div className="bg-white rounded-2xl p-md border border-outline-variant space-y-md">
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
            /* Manual question editor */
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

        {/* Materials selector — only meaningful for AI mode but shown always for context */}
        <div>
          <h3 className="font-label-md text-label-md font-bold uppercase tracking-wider text-secondary mb-md">Source Materials</h3>
          <div className="bg-white rounded-2xl border border-outline-variant p-md space-y-2">
            {MATERIALS_FOR_GENERATION.map((mat) => (
              <label key={mat.id} className="flex items-center gap-3 p-2 rounded-xl cursor-pointer hover:bg-surface-container-low transition-colors">
                <input
                  type="checkbox"
                  className="accent-primary w-4 h-4 rounded"
                  checked={selectedMats.has(mat.id)}
                  onChange={() => toggleMaterial(mat.id)}
                />
                <div>
                  <p className="font-label-md text-label-md text-on-surface truncate max-w-[180px]">{mat.name}</p>
                  <p className="text-[11px] text-secondary uppercase">{mat.type}</p>
                </div>
              </label>
            ))}
          </div>
          <p className="font-label-sm text-label-sm text-secondary mt-2 text-center">
            {mode === 'ai' ? 'Select materials to generate from' : 'Materials used for AI generation'}
          </p>
        </div>
      </div>
    </AppLayout>
  );
}
