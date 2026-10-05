import React from 'react';
import { cn } from '@/lib/utils';
import useToastStore, { toast } from '@/store/toastStore';

const VARIANTS = {
  success: { icon: 'check_circle', iconColor: 'text-tertiary' },
  error: { icon: 'error', iconColor: 'text-error' },
};

/**
 * Global toast viewport. Mount once near the router root so confirmations
 * survive navigation between pages.
 */
export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-2 pointer-events-none"
    >
      {toasts.map((t) => {
        const variant = VARIANTS[t.variant] || VARIANTS.success;
        return (
          <div
            key={t.id}
            role="status"
            className="pointer-events-auto flex items-center gap-2 bg-white pl-3 pr-2 py-2.5 rounded-2xl ambient-shadow border border-outline-variant/50 max-w-[calc(100vw-3rem)]"
          >
            <span className={cn('material-symbols-outlined text-[20px]', variant.iconColor)}>
              {variant.icon}
            </span>
            <p className="font-label-md text-label-md text-on-surface">{t.message}</p>
            <button
              type="button"
              onClick={() => toast.dismiss(t.id)}
              aria-label="Dismiss notification"
              className="p-1 rounded-lg hover:bg-surface-container-low text-secondary transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}
