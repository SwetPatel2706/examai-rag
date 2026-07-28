import React from 'react';
import { cn } from '@/lib/utils';

/** A labelled progress bar. */
export function ProgressBar({ value, className }) {
  return (
    <div className={cn('w-full bg-surface-container h-2 rounded-full overflow-hidden', className)}>
      <div
        className="bg-primary h-full rounded-full transition-all duration-500"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

/**
 * Stat card used on dashboards.
 * @param {{ icon: string, iconBg: string, iconColor: string, value: string, label: string }} props
 */
export function StatCard({ icon, iconBg, iconColor, value, label, className }) {
  return (
    <div className={cn('bg-white p-sp-md rounded-2xl ambient-shadow card-hover flex flex-col gap-sp-xs', className)}>
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-2', iconBg, iconColor)}>
        <span className="material-symbols-outlined">{icon}</span>
      </div>
      <span className="font-display-lg text-display-lg text-on-background">{value}</span>
      <span className="font-label-md text-label-md text-secondary">{label}</span>
    </div>
  );
}

/**
 * Section header with optional "View All" action.
 */
export function SectionHeader({ title, action }) {
  return (
    <div className="flex items-center justify-between mb-sp-sm">
      <h2 className="font-label-md text-label-md font-bold uppercase tracking-wider text-secondary">{title}</h2>
      {action}
    </div>
  );
}
