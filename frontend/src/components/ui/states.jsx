import React from 'react';
import { cn } from '@/lib/utils';

/** Consistent loading placeholder for data-bearing sections. */
export function LoadingState({ label = 'Loading…', className }) {
  return (
    <div role="status" className={cn('flex flex-col items-center justify-center gap-3 py-16 text-secondary', className)}>
      <div aria-hidden="true" className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      <p className="font-label-md text-label-md">{label}</p>
    </div>
  );
}

/** Consistent empty state with an optional action. */
export function EmptyState({ icon = 'inbox', title = 'Nothing here yet', description, action, className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 text-center', className)}>
      <span className="material-symbols-outlined text-[48px] text-outline">{icon}</span>
      <h3 className="font-headline-md text-headline-md text-on-background mt-3">{title}</h3>
      {description && (
        <p className="font-body-md text-body-md text-secondary mt-1 max-w-sm">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** Consistent error state with a retry action (renders the API envelope message). */
export function ErrorState({ message, onRetry, className }) {
  return (
    <div role="alert" className={cn('flex flex-col items-center justify-center gap-3 py-12 text-center', className)}>
      <span className="material-symbols-outlined text-[40px] text-error">error_outline</span>
      <p className="font-body-md text-body-md text-on-surface-variant max-w-md">
        {message || 'Something went wrong.'}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="h-10 px-5 rounded-xl bg-primary text-on-primary font-label-md text-label-md hover:scale-[0.98] transition-all"
        >
          Retry
        </button>
      )}
    </div>
  );
}
