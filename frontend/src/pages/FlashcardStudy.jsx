import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { LoadingState, ErrorState } from '@/components/ui/states';
import { getDeck, updateCardMastery } from '@/api/flashcards';
import { useApi } from '@/lib/useApi';

// No sidebar — minimal chrome per agents.md spec for flashcard study focus
export default function FlashcardStudy() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: deck, loading, error, reload } = useApi(() => getDeck(id), [id]);

  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [results, setResults] = useState([]); // 'got_it' | 'still_learning'

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <LoadingState label="Loading deck…" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center px-sp-md">
        <ErrorState message={error.message} onRetry={reload} />
      </div>
    );
  }

  const cards = deck?.cards || [];
  const card = cards[index];
  const isDone = index >= cards.length;
  const gotItCount = results.filter((r) => r === 'got_it').length;

  // Self-assessment → backend mastery_state; best-effort, never blocks the session.
  async function persistMastery(cardId, result) {
    try {
      await updateCardMastery(cardId, result === 'got_it' ? 'mastered' : 'learning');
    } catch (err) {
      console.debug('Could not persist flashcard mastery:', err);
    }
  }

  function grade(result) {
    if (card) persistMastery(card.id, result);
    setResults((prev) => [...prev, result]);
    setFlipped(false);
    setIndex((i) => i + 1);
  }

  function restart() {
    setIndex(0);
    setFlipped(false);
    setResults([]);
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center" style={{ fontFamily: "'Geist Variable', sans-serif" }}>
      {/* Minimal header */}
      <header className="w-full h-14 bg-white border-b border-outline-variant flex items-center justify-between px-sp-xl shrink-0">
        <button
          onClick={() => navigate('/student/flashcards')}
          className="flex items-center gap-2 text-secondary font-label-md text-label-md hover:text-primary transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          {deck?.title}
        </button>
        <span className="font-label-md text-label-md text-secondary">
          {isDone ? `${cards.length} / ${cards.length}` : `${index + 1} / ${cards.length}`}
        </span>
      </header>

      {/* Progress bar */}
      <div className="w-full h-1 bg-surface-container-high shrink-0">
        <div
          className="bg-primary h-full transition-all duration-500"
          style={{ width: `${((isDone ? cards.length : index) / cards.length) * 100}%` }}
        />
      </div>

      {cards.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-sp-lg">
          <h2 className="font-headline-md text-headline-md text-on-background">This deck has no cards</h2>
          <p className="font-body-md text-body-md text-secondary">Try generating a new deck from your selected materials.</p>
          <button
            onClick={() => navigate('/student/flashcards')}
            className="mt-2 h-12 px-8 rounded-2xl bg-primary text-on-primary font-label-md text-label-md"
          >
            Back to Decks
          </button>
        </div>
      ) : isDone ? (
        /* Session complete */
        <div className="flex-1 flex flex-col items-center justify-center gap-sp-xl text-center p-sp-lg">
          <div className="w-24 h-24 rounded-full bg-tertiary-fixed/30 flex items-center justify-center">
            <span className="material-symbols-outlined text-tertiary text-[48px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              check_circle
            </span>
          </div>
          <div>
            <h2 className="font-headline-lg text-headline-lg text-on-background mb-2">Session Complete!</h2>
            <p className="font-body-md text-body-md text-secondary">
              {gotItCount} of {cards.length} cards marked as Got It.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={restart}
              className="h-12 px-8 rounded-2xl border-2 border-outline-variant text-secondary font-label-md text-label-md hover:bg-surface-container-low transition-colors"
            >
              Study Again
            </button>
            <button
              onClick={() => navigate('/student/flashcards')}
              className="h-12 px-8 rounded-2xl bg-primary text-on-primary font-label-md text-label-md hover:scale-[0.98] transition-all"
            >
              Back to Decks
            </button>
          </div>
        </div>
      ) : (
        /* Card study view */
        <div className="flex-1 flex flex-col items-center justify-center gap-sp-xl p-sp-lg w-full max-w-2xl">
          {/* Card flip */}
          <div className="w-full" style={{ perspective: '1000px' }}>
            <button
              onClick={() => setFlipped((v) => !v)}
              className="w-full"
              aria-label={flipped ? 'Show question' : 'Reveal answer'}
              style={{ perspective: '1000px' }}
            >
              <div
                className="relative w-full"
                style={{
                  transformStyle: 'preserve-3d',
                  transition: 'transform 0.5s',
                  transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                  minHeight: '280px',
                }}
              >
                {/* Front */}
                <div
                  className="absolute inset-0 bg-white rounded-3xl ambient-shadow flex flex-col items-center justify-center p-sp-xl text-center"
                  style={{ backfaceVisibility: 'hidden' }}
                >
                  <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider mb-sp-md">Question</span>
                  <p className="font-headline-md text-headline-md text-on-background">{card.front}</p>
                  <p className="font-label-sm text-label-sm text-secondary mt-sp-lg opacity-60">Tap to reveal answer</p>
                </div>
                {/* Back */}
                <div
                  className="absolute inset-0 bg-primary-fixed rounded-3xl ambient-shadow flex flex-col items-center justify-center p-sp-xl text-center"
                  style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                >
                  <span className="font-label-sm text-label-sm text-primary uppercase tracking-wider mb-sp-md">Answer</span>
                  <p className="font-body-lg text-body-lg text-on-background">{card.back}</p>
                </div>
              </div>
            </button>
          </div>

          {/* Self-assessment buttons — shown only after flip */}
          <div className={cn('flex gap-4 w-full transition-opacity duration-300', flipped ? 'opacity-100' : 'opacity-0 pointer-events-none')}>
            <button
              disabled={!flipped}
              onClick={() => grade('still_learning')}
              className="flex-1 h-14 rounded-2xl border-2 border-error text-error font-label-md text-label-md flex items-center justify-center gap-2 hover:bg-error-container transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">replay</span>
              Still Learning
            </button>
            <button
              disabled={!flipped}
              onClick={() => grade('got_it')}
              className="flex-1 h-14 rounded-2xl border-2 border-tertiary bg-tertiary-fixed/20 text-tertiary font-label-md text-label-md flex items-center justify-center gap-2 hover:bg-tertiary-fixed/40 transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              Got It
            </button>
          </div>

          {/* Dot indicators */}
          <div className="flex gap-2">
            {cards.map((_, i) => (
              <span
                key={i}
                className={cn('w-2 h-2 rounded-full transition-all', {
                  'bg-primary scale-125': i === index,
                  'bg-tertiary': i < index && results[i] === 'got_it',
                  'bg-error': i < index && results[i] === 'still_learning',
                  'bg-outline-variant': i > index,
                })}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
