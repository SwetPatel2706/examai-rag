import React from 'react';
import { LoadingState } from '@/components/ui/states';

/**
 * Suspense fallback while a lazy route chunk loads. Deliberately lightweight:
 * the session/bootstrap path must stay small, and data-heavy screens replace
 * this with their own layout-preserving skeletons once mounted.
 */
export default function RouteFallback() {
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center" aria-busy="true">
      <LoadingState label="Loading…" />
    </div>
  );
}
