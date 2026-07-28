import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Simple page-number pagination footer.
 * @param {{ currentPage: number, totalPages: number, onPageChange: (page: number) => void, summary?: string }} props
 */
export function Pagination({ currentPage, totalPages, onPageChange, summary }) {
  const pages = buildPageNumbers(currentPage, totalPages);

  return (
    <div className="bg-surface-container-low px-sp-md py-2 border-t border-outline-variant/10 flex items-center justify-between">
      {summary && (
        <span className="text-label-sm font-label-sm text-on-surface-variant">{summary}</span>
      )}
      <div className="flex items-center gap-4 ml-auto">
        {pages.map((page, i) =>
          page === '...' ? (
            <span key={`ellipsis-${i}`} className="text-on-surface-variant px-1">
              ...
            </span>
          ) : (
            <button
              key={page}
              type="button"
              onClick={() => onPageChange(page)}
              className={cn(
                'w-8 h-8 flex items-center justify-center rounded-lg font-label-sm text-label-sm transition-colors',
                currentPage === page
                  ? 'bg-primary text-on-primary'
                  : 'hover:bg-surface-container-high text-on-surface-variant'
              )}
            >
              {page}
            </button>
          )
        )}
      </div>
    </div>
  );
}

function buildPageNumbers(current, total) {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 3) return [1, 2, 3, '...', total];
  if (current >= total - 2) return [1, '...', total - 2, total - 1, total];
  return [1, '...', current, '...', total];
}
