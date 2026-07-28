import React from 'react';
import { cn } from '@/lib/utils';

/**
 * Page title block used at the top of main content areas.
 */
export function PageHeader({ title, description, action, className }) {
  return (
    <header className={cn('mb-sp-lg flex items-end justify-between', className)}>
      <div>
        <h1 className="font-headline-lg text-headline-lg text-on-surface">{title}</h1>
        {description && (
          <p className="text-on-surface-variant font-body-md text-body-md mt-1">{description}</p>
        )}
      </div>
      {action && <div className="flex items-center gap-2 shrink-0">{action}</div>}
    </header>
  );
}
