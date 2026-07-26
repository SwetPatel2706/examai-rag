import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import MaterialScopePanel from '@/components/MaterialScopePanel';
import useMaterialScopeStore from '@/store/materialScopeStore';
import { SectionHeader } from '@/components/ui/shared';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

// --- Mock data (replace with GET /flashcard-decks when backend is ready) ---
const DECKS = [
  {
    id: 'fd1',
    title: 'Data Structures Essentials',
    subject: 'Data Structures',
    cardCount: 24,
    lastStudied: '2026-07-22',
    mastered: 18,
  },
  {
    id: 'fd2',
    title: 'Macroeconomics Key Terms',
    subject: 'Macroeconomics',
    cardCount: 16,
    lastStudied: '2026-07-20',
    mastered: 10,
  },
];

// Materials available for deck generation (replace with GET /subjects/:id/materials)
const ALL_MATERIALS_BY_TEACHER = [
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
];

function DeckCard({ deck, onStudy }) {
  const masteredPct = Math.round((deck.mastered / deck.cardCount) * 100);
  return (
    <div className="bg-white rounded-2xl ambient-shadow card-hover p-md flex flex-col gap-3">
      <div>
        <p className="font-label-sm text-label-sm text-secondary uppercase tracking-wider mb-1">{deck.subject}</p>
        <h3 className="font-headline-md text-[18px] text-on-background">{deck.title}</h3>
      </div>

      <div className="flex items-center gap-4 text-secondary font-label-sm text-label-sm">
        <span className="flex items-center gap-1">
          <span className="material-symbols-outlined text-[16px]">style</span>
          {deck.cardCount} cards
        </span>
        <span className="flex items-center gap-1">
          <span className="material-symbols-outlined text-[16px]">check_circle</span>
          {deck.mastered} mastered
        </span>
      </div>

      <div>
        <div className="flex justify-between text-[12px] font-label-md mb-1">
          <span className="text-secondary">Mastery</span>
          <span className="text-tertiary font-bold">{masteredPct}%</span>
        </div>
        <div className="w-full h-2 bg-surface-container-high rounded-full overflow-hidden">
          <div className="bg-tertiary h-full rounded-full" style={{ width: `${masteredPct}%` }} />
        </div>
      </div>

      <p className="text-[11px] text-secondary">Last studied: {deck.lastStudied}</p>

      <button
        onClick={() => onStudy(deck.id)}
        className="mt-auto h-10 bg-primary text-on-primary rounded-xl font-label-md text-label-md hover:scale-[0.98] transition-all"
      >
        Study Now
      </button>
    </div>
  );
}

export default function FlashcardDecks() {
  const navigate = useNavigate();
  const [generateOpen, setGenerateOpen] = useState(false);
  const { getSelectedArray, reset } = useMaterialScopeStore();

  function handleGenerate() {
    const selected = getSelectedArray();
    if (!selected.length) return;
    // TODO: POST /flashcard-decks { material_ids: selected } when backend is ready
    setGenerateOpen(false);
    reset();
    // For now navigate to study with first deck as preview
    navigate('/student/flashcards/fd1/study');
  }

  return (
    <AppLayout role="student">
      <header className="flex items-center justify-between mb-xl">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-background">Flashcard Decks</h1>
          <p className="font-body-md text-body-md text-secondary mt-1">Your personal study decks, generated from approved materials.</p>
        </div>
        <button
          onClick={() => { reset(); setGenerateOpen(true); }}
          className="h-12 px-6 bg-primary text-on-primary rounded-full font-label-md text-label-md flex items-center gap-2 hover:scale-95 transition-all shadow-md"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Generate New Deck
        </button>
      </header>

      <SectionHeader title={`Your Decks (${DECKS.length})`} />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-gutter">
        {DECKS.map((deck) => (
          <DeckCard key={deck.id} deck={deck} onStudy={(id) => navigate(`/student/flashcards/${id}/study`)} />
        ))}
      </div>

      {/* Generate New Deck dialog — reuses MaterialScopePanel */}
      <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Generate Flashcard Deck</DialogTitle>
          </DialogHeader>
          <p className="font-body-md text-body-md text-secondary">
            Select the materials you want ExamAI to generate flashcards from.
          </p>
          <div className="max-h-80 overflow-y-auto custom-scrollbar mt-2">
            <MaterialScopePanel materialsByTeacher={ALL_MATERIALS_BY_TEACHER} />
          </div>
          <DialogFooter>
            <button
              onClick={() => setGenerateOpen(false)}
              className="h-9 px-4 rounded-lg border border-outline-variant text-secondary font-label-md text-label-md hover:bg-surface-container-low transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleGenerate}
              className="h-9 px-6 rounded-lg bg-primary text-on-primary font-label-md text-label-md hover:scale-[0.98] transition-all disabled:opacity-40"
            >
              Generate
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
