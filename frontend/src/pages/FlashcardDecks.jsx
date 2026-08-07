import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '@/components/layout/AppLayout';
import MaterialScopePanel from '@/components/MaterialScopePanel';
import useMaterialScopeStore from '@/store/materialScopeStore';
import useSubjectStore from '@/store/subjectStore';
import { SectionHeader } from '@/components/ui/shared';
import { LoadingState, EmptyState, ErrorState } from '@/components/ui/states';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useApi } from '@/lib/useApi';
import { listDecks, generateDeck } from '@/api/flashcards';
import { getStudentSubjects } from '@/api/analytics';
import { listSubjectMaterials } from '@/api/subjects';
import { cn } from '@/lib/utils';
import { groupByTeacher } from '@/lib/materials';

function DeckCard({ deck, onStudy }) {
  const cardCount = deck.cards.length;
  const mastered = deck.cards.filter((c) => c.masteryState === 'mastered').length;
  const masteredPct = cardCount ? Math.round((mastered / cardCount) * 100) : 0;

  return (
    <div className="bg-white rounded-2xl ambient-shadow card-hover p-sp-md flex flex-col gap-3">
      <div>
        <p className="font-label-sm text-label-sm text-secondary uppercase tracking-wider mb-1">{deck.subject || 'Flashcards'}</p>
        <h3 className="font-headline-md text-[18px] text-on-background">{deck.title}</h3>
      </div>

      <div className="flex items-center gap-4 text-secondary font-label-sm text-label-sm">
        <span className="flex items-center gap-1">
          <span className="material-symbols-outlined text-[16px]">style</span>
          {cardCount} cards
        </span>
        <span className="flex items-center gap-1">
          <span className="material-symbols-outlined text-[16px]">check_circle</span>
          {mastered} mastered
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
  const { currentSubjectId, setCurrentSubject } = useSubjectStore();
  const { getSelectedArray, reset } = useMaterialScopeStore();

  const [generateOpen, setGenerateOpen] = useState(false);
  const [genSubjectId, setGenSubjectId] = useState(null);
  const [genLoading, setGenLoading] = useState(false);
  const [genError, setGenError] = useState(null);

  const decksApi = useApi(listDecks, []);
  const subjectsApi = useApi(getStudentSubjects, []);

  const subjects = subjectsApi.data || [];
  const activeGenSubjectId = genSubjectId ?? currentSubjectId ?? subjects[0]?.subjectId;

  const materialsApi = useApi(
    () => (activeGenSubjectId ? listSubjectMaterials(activeGenSubjectId, { status: 'ready', size: 100 }) : Promise.resolve({ items: [] })),
    [activeGenSubjectId, generateOpen]
  );
  const materialsByTeacher = groupByTeacher(materialsApi.data?.items);

  // Default generation subject to the store's current subject once subjects load.
  useEffect(() => {
    if (!currentSubjectId && subjects.length > 0) {
      setCurrentSubject(subjects[0].subjectId);
    }
  }, [currentSubjectId, subjects, setCurrentSubject]);

  async function handleGenerate() {
    const selected = getSelectedArray();
    if (!selected.length || genLoading) return;
    setGenLoading(true);
    setGenError(null);
    try {
      const subject = subjects.find((s) => s.subjectId === activeGenSubjectId);
      const deck = await generateDeck({
        subjectId: activeGenSubjectId,
        materialIds: selected,
        title: `Flashcards — ${subject?.name || 'Study Deck'}`,
        cardCount: 10,
      });
      setGenerateOpen(false);
      reset();
      decksApi.reload();
      navigate(`/student/flashcards/${deck.id}/study`);
    } catch (err) {
      setGenError(err);
      setGenLoading(false);
    }
  }

  if (decksApi.loading) {
    return (
      <AppLayout role="student">
        <LoadingState label="Loading your decks…" />
      </AppLayout>
    );
  }

  if (decksApi.error) {
    return (
      <AppLayout role="student">
        <ErrorState message={decksApi.error.message} onRetry={decksApi.reload} />
      </AppLayout>
    );
  }

  const decks = decksApi.data || [];

  return (
    <AppLayout role="student">
      <header className="flex items-center justify-between mb-sp-xl">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-background">Flashcard Decks</h1>
          <p className="font-body-md text-body-md text-secondary mt-1">Your personal study decks, generated from approved materials.</p>
        </div>
        <button
          onClick={() => { reset(); setGenSubjectId(null); setGenError(null); setGenerateOpen(true); }}
          className="h-12 px-6 bg-primary text-on-primary rounded-full font-label-md text-label-md flex items-center gap-2 hover:scale-95 transition-all shadow-md"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Generate New Deck
        </button>
      </header>

      <SectionHeader title={`Your Decks (${decks.length})`} />
      {decks.length === 0 ? (
        <EmptyState
          icon="style"
          title="No decks yet"
          description="Generate your first deck from approved subject materials."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-gutter">
          {decks.map((deck) => (
            <DeckCard key={deck.id} deck={deck} onStudy={(id) => navigate(`/student/flashcards/${id}/study`)} />
          ))}
        </div>
      )}

      {/* Generate New Deck dialog — reuses MaterialScopePanel */}
      <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Generate Flashcard Deck</DialogTitle>
          </DialogHeader>
          <p className="font-body-md text-body-md text-secondary">
            Pick a subject, then select the materials ExamAI should generate flashcards from.
          </p>

          {subjectsApi.error ? (
            <ErrorState message={subjectsApi.error.message} onRetry={subjectsApi.reload} />
          ) : (
            <>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider">Subject:</span>
                {subjects.map((s) => (
                  <button
                    key={s.subjectId}
                    onClick={() => { setGenSubjectId(s.subjectId); reset(); }}
                    className={cn(
                      'px-3 py-1 rounded-full font-label-md text-label-md transition-all',
                      s.subjectId === activeGenSubjectId
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface-container-low text-secondary hover:bg-primary-fixed'
                    )}
                  >
                    {s.name}
                  </button>
                ))}
              </div>

              {materialsApi.loading ? (
                <div className="py-6"><LoadingState label="Loading materials…" /></div>
              ) : materialsApi.error ? (
                <ErrorState message={materialsApi.error.message} onRetry={materialsApi.reload} />
              ) : (
                <div className="max-h-80 overflow-y-auto custom-scrollbar mt-2">
                  <MaterialScopePanel materialsByTeacher={materialsByTeacher} />
                </div>
              )}
            </>
          )}

          {genError && <p className="text-error font-label-sm text-label-sm">Failed to generate: {genError.message}</p>}

          <DialogFooter>
            <button
              onClick={() => setGenerateOpen(false)}
              className="h-9 px-4 rounded-lg border border-outline-variant text-secondary font-label-md text-label-md hover:bg-surface-container-low transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleGenerate}
              disabled={!getSelectedArray().length || genLoading}
              className="h-9 px-6 rounded-lg bg-primary text-on-primary font-label-md text-label-md hover:scale-[0.98] transition-all disabled:opacity-40"
            >
              {genLoading ? 'Generating…' : 'Generate'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
