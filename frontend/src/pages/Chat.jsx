import React, { useState, useRef, useEffect } from 'react';
import AppLayout from '@/components/layout/AppLayout';
import MaterialScopePanel from '@/components/MaterialScopePanel';
import useMaterialScopeStore from '@/store/materialScopeStore';
import useSubjectStore from '@/store/subjectStore';
import { LoadingState, ErrorState } from '@/components/ui/states';
import { useApi } from '@/lib/useApi';
import { listSubjects, listSubjectMaterials } from '@/api/subjects';
import { askQuestion } from '@/api/chat';
import { cn } from '@/lib/utils';

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

function groupByTeacher(items) {
  const groups = [];
  const byTeacher = new Map();
  for (const mat of items || []) {
    const key = mat.teacherId;
    if (!byTeacher.has(key)) {
      const group = { teacher: { id: key, name: mat.teacherName || 'Unknown' }, materials: [] };
      byTeacher.set(key, group);
      groups.push(group);
    }
    byTeacher.get(key).materials.push({ id: mat.id, name: mat.name, type: mat.fileType });
  }
  return groups;
}

export default function Chat() {
  const { currentSubjectId, setCurrentSubject, setSubjects } = useSubjectStore();
  const { selectedIds, deselectAll, getSelectedArray } = useMaterialScopeStore();

  const subjectsApi = useApi(async () => {
    const list = await listSubjects();
    setSubjects(list);
    return list;
  }, []);

  const subjects = subjectsApi.data || [];
  const activeSubjectId = currentSubjectId ?? subjects[0]?.id;
  const activeSubject = subjects.find((s) => s.id === activeSubjectId);

  const materialsApi = useApi(
    () => (activeSubjectId ? listSubjectMaterials(activeSubjectId, { status: 'ready', size: 100 }) : Promise.resolve({ items: [] })),
    [activeSubjectId]
  );
  const materialsByTeacher = groupByTeacher(materialsApi.data?.items);

  // Default to the first subject when none is selected yet.
  useEffect(() => {
    if (!currentSubjectId && subjects.length > 0) {
      setCurrentSubject(subjects[0].id);
    }
  }, [currentSubjectId, subjects, setCurrentSubject]);

  const [scopeOpen, setScopeOpen] = useState(true);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const epochRef = useRef(0);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Greeting once a subject is resolved.
  useEffect(() => {
    if (activeSubject && messages.length === 0) {
      setMessages([
        {
          id: 'init',
          role: 'assistant',
          text: `Hello! I'm your AI study assistant for **${activeSubject.name}**. Select materials on the left, then ask me anything.`,
          citations: [],
        },
      ]);
    }
  }, [activeSubject, messages.length]);

  function handleSubjectChange(id) {
    if (id === activeSubjectId) return;
    epochRef.current += 1;
    setCurrentSubject(id);
    deselectAll();
    setLoading(false);
    setMessages([
      {
        id: `init-${id}`,
        role: 'assistant',
        text: `Switched to **${subjects.find((s) => s.id === id)?.name}**. Select materials and ask away!`,
        citations: [],
      },
    ]);
  }

  async function sendMessage() {
    const q = input.trim();
    if (!q || loading) return;

    if (selectedIds.size === 0) {
      setMessages((prev) => [
        ...prev,
        {
          id: `hint-${Date.now()}`,
          role: 'assistant',
          text: 'Please select at least one study material from the panel on the left so I can answer from the right sources.',
          citations: [],
        },
      ]);
      return;
    }

    const currentEpoch = epochRef.current;
    const userMsg = { id: `u-${Date.now()}`, role: 'user', text: q, citations: [] };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const response = await askQuestion({
        subjectId: activeSubjectId,
        selectedMaterialIds: getSelectedArray(),
        question: q,
      });
      if (currentEpoch !== epochRef.current) return;
      setMessages((prev) => [...prev, { id: `a-${Date.now()}`, role: 'assistant', text: response.answerText, citations: response.citations }]);
    } catch (err) {
      if (currentEpoch !== epochRef.current) return;
      setMessages((prev) => [
        ...prev,
        {
          id: `a-err-${Date.now()}`,
          role: 'assistant',
          text: `I couldn't answer that: ${err.message}`,
          citations: [],
          isError: true,
        },
      ]);
    } finally {
      if (currentEpoch === epochRef.current) setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  if (subjectsApi.loading || materialsApi.loading) {
    return (
      <AppLayout role="student">
        <LoadingState label="Loading chat…" />
      </AppLayout>
    );
  }

  if (subjectsApi.error || (activeSubjectId && materialsApi.error)) {
    const message = subjectsApi.error?.message || materialsApi.error?.message;
    const onRetry = subjectsApi.error ? subjectsApi.reload : materialsApi.reload;
    return (
      <AppLayout role="student">
        <ErrorState message={message} onRetry={onRetry} />
      </AppLayout>
    );
  }

  return (
    <AppLayout role="student">
      {/* Two-panel layout fills the content area */}
      <div className="flex gap-0 h-[calc(100vh-96px)] -m-margin-desktop">

        {/* ── Left: Materials Scope Panel ── */}
        <aside
          className={cn(
            'flex-shrink-0 border-r border-outline-variant bg-white transition-all duration-300 overflow-y-auto custom-scrollbar',
            scopeOpen ? 'w-72 p-sp-md' : 'w-0 p-0 overflow-hidden'
          )}
        >
          {materialsApi.error ? (
            <ErrorState message={materialsApi.error.message} onRetry={materialsApi.reload} className="py-8" />
          ) : (
            <MaterialScopePanel materialsByTeacher={materialsByTeacher} />
          )}
        </aside>

        {/* ── Right: Chat Area ── */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Chat Toolbar */}
          <div className="flex items-center gap-3 px-sp-md py-sp-sm border-b border-outline-variant bg-white shrink-0">
            {/* Toggle scope panel */}
            <button
              onClick={() => setScopeOpen((v) => !v)}
              title={scopeOpen ? 'Hide materials' : 'Show materials'}
              className="p-sp-xs rounded-lg hover:bg-surface-container-low text-secondary transition-colors"
            >
              <span className="material-symbols-outlined">{scopeOpen ? 'menu_open' : 'menu'}</span>
            </button>

            {/* Subject switcher */}
            <div className="flex items-center gap-2 flex-1">
              <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider">Subject:</span>
              <div className="flex gap-2 flex-wrap">
                {subjects.map((s) => (
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
          <div className="flex-1 overflow-y-auto custom-scrollbar p-sp-md space-y-4 bg-surface">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}
              >
                <div
                  className={cn(
                    'max-w-[75%] px-sp-md py-sp-sm rounded-2xl font-body-md text-body-md leading-relaxed',
                    msg.role === 'user'
                      ? 'bg-primary text-on-primary rounded-br-sm'
                      : msg.isError
                        ? 'bg-error-container text-error rounded-bl-sm'
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
                <div className="bg-white ambient-shadow px-sp-md py-sp-sm rounded-2xl rounded-bl-sm flex items-center gap-2">
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
          <div className="shrink-0 p-sp-md bg-white border-t border-outline-variant">
            <div className="flex items-end gap-3 bg-surface-container-low rounded-2xl px-sp-md py-sp-sm">
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
