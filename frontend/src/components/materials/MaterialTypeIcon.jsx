import React from 'react';
import { cn } from '@/lib/utils';
import { getTypeConfig } from '@/lib/materials';

/**
 * File-type icon with themed background — inline (table) or boxed (cards).
 */
export function MaterialTypeIcon({ type, variant = 'inline', className }) {
  const config = getTypeConfig(type);

  if (variant === 'boxed') {
    return (
      <div
        className={cn(
          'w-10 h-10 rounded flex items-center justify-center shrink-0',
          config.bg,
          className
        )}
      >
        <span className={cn('material-symbols-outlined text-[20px]', config.color)}>
          {config.icon}
        </span>
      </div>
    );
  }

  return (
    <span className={cn('material-symbols-outlined text-[20px]', config.color, className)}>
      {config.icon}
    </span>
  );
}
