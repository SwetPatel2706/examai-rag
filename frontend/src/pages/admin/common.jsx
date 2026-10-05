import React from 'react';
import { cn } from '@/lib/utils';
import { LABEL_CLASS } from '@/lib/adminStyles';

export function RoleBadge({ role }) {
  const style = role === 'teacher' ? 'bg-primary-fixed text-primary' : 'bg-tertiary-fixed/30 text-tertiary';
  return (
    <span className={cn('px-2 py-0.5 rounded-full text-[12px] font-bold capitalize', style)}>
      {role}
    </span>
  );
}

export function Field({ label, htmlFor, children }) {
  return (
    <div className="space-y-1">
      <label htmlFor={htmlFor} className={LABEL_CLASS}>
        {label}
      </label>
      {children}
    </div>
  );
}

export function FormError({ message }) {
  if (!message) return null;
  return (
    <div className="flex items-center gap-2 rounded-xl bg-error-container p-3">
      <span className="material-symbols-outlined text-[18px] text-error">error</span>
      <p className="text-error font-label-sm text-label-sm">{message}</p>
    </div>
  );
}

export function ActionErrorBanner({ message }) {
  if (!message) return null;
  return (
    <div className="flex items-center gap-2 rounded-xl bg-error-container p-3 mb-sp-lg">
      <span className="material-symbols-outlined text-[18px] text-error">error</span>
      <p className="text-error font-label-sm text-label-sm">{message}</p>
    </div>
  );
}
