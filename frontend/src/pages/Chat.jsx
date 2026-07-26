import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import MaterialScopePanel from '@/components/MaterialScopePanel';
import useMaterialScopeStore from '@/store/materialScopeStore';
import useSubjectStore from '@/store/subjectStore';
import { cn } from '@/lib/utils';

// --- Mock data (replace with API /subjects and /chat when backend is ready) ---
const SUBJECTS_LIST = [
  { id: 's1', name: 'Data Structures' },
  { id: 's2', name: 'Macroeconomics' },
  { id: 's3', name: 'Linear Algebra' },
];

const MATERIALS_BY_SUBJECT = {
  s1: [
    {
      teacher: { id: 't1', name: 'Dr. Eleanor Vance' },
      materials: [
        { id: 'm1', name: 'Week 1 — Arrays & Complexity.pdf', type: 'PDF' },
        { id: 'm2', name: 'Week 2 — Linked Lists.pdf', type: 'PDF' },
      ],
    },
    {
      teacher: { id: 't2', name: 'Dr. Priya Nair' },
      materials: [{ id: 'm3', name: 'Graph Algorithms.pdf', type: 'PDF' }],
    },
  ],
  s2: [
    {
      teacher: { id: 't3', name: 'Prof. Julian Thorne' },
      materials: [{ id: 'm4', name: 'Macroeconomic Theory Ch1.pdf', type: 'PDF' }],
    },
  ],
  s3: [
    {
      teacher: { id: 't4', name: 'Dr. Sarah Chen' },
      materials: [
        { id: 'm5', name: 'Matrix Operations.pdf', type: 'PDF' },
        { id: 'm6', name: 'Eigenvalues Lecture.pdf', type: 'PDF' },
      ],
    },
  ],
};

/**
 * Citation tooltip shown on hover over [N] markers.
 */
function Citation({ num, teacherName, materialFilename }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-block">
      <button
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
        className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-on-primary text-[10px] font-bold mx-0.5 cursor-help align-super leading-none"
        aria-label={`Citation ${num}: ${teacherName} — ${materialFilename}`}
      >
        {num}
      </button>
      {show && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-52 bg-inverse-surface text-inverse-on-surface text-[12px] rounded-xl px-3 py-2 shadow-lg pointer-events-none whitespace-normal">
          <span className="font-bold block">{teacherName}</span>
          <span className="opacity-80">{materialFilename}</span>
        </span>
      )}
    </span>
  );
}

/**
 * Parses message text and replaces [N] with <Citation> components.
 * Citations array: [{num, teacherName, materialFilename}]
 */
function MessageContent({ text, citations = [] }) {
  if (!citations.length) return <span>{text}</span>;

  const parts = text.split(/(\[\d+\])/g);
  return (
    <>
      {parts.map((part, i) => {
        const match = part.match(/^\[(\d+)\]$/);
        if (match) {
          const num = parseInt(match[1], 10);
          const cite = citations.find((c) => c.num === num);
          return cite ? (
            <Citation key={i} num={num} teacherName={cite.teacherName} materialFilename={cite.materialFilename} />
          ) : (
            <span key={i}>{part}</span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

// Simulated AI response — replace with POST /chat when backend is ready
function buildMockResponse(question, subjectId, selectedIds) {
  const matList = (MATERIALS_BY_SUBJECT[subjectId] ?? []).flatMap((g) =>
    g.materials.filter((m) => selectedIds.has(m.id)).map((m) => ({ ...m, teacherName: g.teacher.name }))
  );
  if (!matList.length) {
    return {
      text: "Please select at least one study material from the panel on the left so I can answer from the right sources.",
      citations: [],
    };
  }
  const cites = matList.slice(0, 2).map((m, i) => ({
    num: i + 1,
    teacherName: m.teacherName,
    materialFilename: m.name,
    materialId: m.id,
  }));
  return {
    text: `Based on your selected materials, here is a concise answer to "${question}". The key concept is explained thoroughly in [1]${cites[1] ? ` and reinforced in [2]` : ''}.`,
    citations: cites,
  };
}

export default function Chat() {
  const navigate = useNavigate();
  const { currentSubjectId, setCurrentSubject } = useSubjectStore();
  const { selectedIds } = useMaterialScopeStore();

  const activeSubjectId = currentSubjectId ?? SUBJECTS_LIST[0].id;
  const activeSubject = SUBJECTS_LIST.find((s) => s.id === activeSubjectId) ?? SUBJECTS_LIST[0];
  const materialsByTeacher = MATERIALS_BY_SUBJECT[activeSubjectId] ?? [];

  const [scopeOpen, setScopeOpen] = useState(true);
  const [messages, setMessages] = useState([
    {
      id: 'init',
      role: 'assistant',
      text: `Hello! I'm your AI study assistant for **${activeSubject.name}**. Select materials on the left, then ask me anything.`,
      citations: [],
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function handleSubjectChange(id) {
    setCurrentSubject(id);
    setMessages([{
      id: `init-${id}`,
      role: 'assistant',
      text: `Switched to **${SUBJECTS_LIST.find((s) => s.id === id)?.name}**. Select materials and ask away!`,
      citations: [],
    }]);
  }

  function sendMessage() {
    const q = input.trim();
    if (!q || loading) return;

    const userMsg = { id: `u-${Date.now()}`, role: 'user', text: q, citations: [] };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    // Simulate network delay — replace with actual fetch to POST /api/chat
    setTimeout(() => {
      const response = buildMockResponse(q, activeSubjectId, selectedIds);
      setMessages((prev) => [...prev, { id: `a-${Date.now()}`, role: 'assistant', ...response }]);
      setLoading(false);
    }, 900);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <AppLayout role="student">
      {/* Two-panel layout fills the content area */}
      <div className="flex gap-0 h-[calc(100vh-96px)] -m-margin-desktop">

        {/* ── Left: Materials Scope Panel ── */}
        <aside
          className={cn(
            'flex-shrink-0 border-r border-outline-variant bg-white transition-all duration-300 overflow-y-auto custom-scrollbar',
            scopeOpen ? 'w-72 p-md' : 'w-0 p-0 overflow-hidden'
          )}
        >
          <MaterialScopePanel materialsByTeacher={materialsByTeacher} />
        </aside>

        {/* ── Right: Chat Area ── */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Chat Toolbar */}
          <div className="flex items-center gap-3 px-md py-sm border-b border-outline-variant bg-white shrink-0">
            {/* Toggle scope panel */}
            <button
              onClick={() => setScopeOpen((v) => !v)}
              title={scopeOpen ? 'Hide materials' : 'Show materials'}
              className="p-xs rounded-lg hover:bg-surface-container-low text-secondary transition-colors"
            >
              <span className="material-symbols-outlined">{scopeOpen ? 'menu_open' : 'menu'}</span>
            </button>

            {/* Subject switcher */}
            <div className="flex items-center gap-2 flex-1">
              <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider">Subject:</span>
              <div className="flex gap-2 flex-wrap">
                {SUBJECTS_LIST.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => handleSubjectChange(s.id)}
                    className={cn(
                      'px-3 py-1 rounded-full font-label-md text-label-md transition-all',
                      s.id === activeSubjectId
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface-container-low text-secondary hover:bg-primary-fixed'
                    )}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>

            <span className="font-label-sm text-label-sm text-secondary">
              {selectedIds.size} material{selectedIds.size !== 1 ? 's' : ''} selected
            </span>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-md space-y-4 bg-surface">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}
              >
                <div
                  className={cn(
                    'max-w-[75%] px-md py-sm rounded-2xl font-body-md text-body-md leading-relaxed',
                    msg.role === 'user'
                      ? 'bg-primary text-on-primary rounded-br-sm'
                      : 'bg-white text-on-surface ambient-shadow rounded-bl-sm'
                  )}
                >
                  <MessageContent text={msg.text} citations={msg.citations} />
                  {msg.citations.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-outline-variant/30 space-y-1">
                      {msg.citations.map((c) => (
                        <p key={c.num} className="text-[12px] text-secondary">
                          <span className="font-bold text-primary">[{c.num}]</span> {c.teacherName} — {c.materialFilename}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white ambient-shadow px-md py-sm rounded-2xl rounded-bl-sm flex items-center gap-2">
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="w-2 h-2 bg-primary rounded-full animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                  <span className="font-label-sm text-label-sm text-secondary">Thinking…</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input Bar */}
          <div className="shrink-0 p-md bg-white border-t border-outline-variant">
            <div className="flex items-end gap-3 bg-surface-container-low rounded-2xl px-md py-sm">
              <textarea
                rows={1}
                className="flex-1 bg-transparent resize-none outline-none font-body-md text-body-md text-on-surface placeholder:text-secondary max-h-40 min-h-[24px]"
                placeholder="Ask about your study material…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || loading}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-primary text-on-primary disabled:opacity-40 hover:scale-95 transition-all duration-150"
              >
                <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>send</span>
              </button>
            </div>
            <p className="text-[11px] text-secondary text-center mt-2">
              AI answers cite sources — hover <span className="font-bold text-primary">[ ]</span> markers to see teacher + material.
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
