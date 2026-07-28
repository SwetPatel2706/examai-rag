import React from 'react';
import { cn } from '@/lib/utils';

/**
 * List / grid view toggle used on resource tables.
 */
export function ViewToggle({ view, onChange }) {
  return (
    <div className="flex bg-surface-container-low p-1 rounded-lg border border-outline-variant/20">
      <button
        type="button"
        onClick={() => onChange('grid')}
        className={cn(
          'p-1 rounded transition-colors',
          view === 'grid'
            ? 'bg-white shadow-sm text-primary'
            : 'hover:bg-surface-container-high text-on-surface-variant'
        )}
        aria-label="Grid view"
      >
        <span className="material-symbols-outlined text-[20px]">grid_view</span>
      </button>
      <button
        type="button"
        onClick={() => onChange('list')}
        className={cn(
          'p-1 rounded transition-colors',
          view === 'list'
            ? 'bg-white shadow-sm text-primary'
            : 'hover:bg-surface-container-high text-on-surface-variant'
        )}
        aria-label="List view"
      >
        <span className="material-symbols-outlined text-[20px]">list</span>
      </button>
    </div>
  );
}
