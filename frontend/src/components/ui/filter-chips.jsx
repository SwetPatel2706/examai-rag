import React from 'react';
import { cn } from '@/lib/utils';

const CHIP_BASE =
  'px-4 py-1.5 rounded-full font-label-md text-label-md transition-all ambient-shadow';

const CHIP_INACTIVE =
  'bg-white text-on-surface-variant hover:bg-surface-container-high border border-outline-variant/10';

const CHIP_ACTIVE = 'bg-primary text-on-primary';

export function FilterChip({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(CHIP_BASE, active ? CHIP_ACTIVE : CHIP_INACTIVE)}
    >
      {label}
    </button>
  );
}

export function FilterChipGroup({ options, value, onChange, className, labelById }) {
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {options.map((option) => (
        <FilterChip
          key={option}
          label={labelById ? labelById(option) : option}
          active={value === option}
          onClick={() => onChange(option)}
        />
      ))}
    </div>
  );
}

const CHECKBOX_LABEL =
  'flex items-center gap-2 px-4 py-1.5 rounded-md font-label-md text-label-md bg-white text-on-surface-variant hover:bg-surface-container-high border border-outline-variant/10 cursor-pointer transition-all ambient-shadow';

export function TeacherFilterCheckbox({ name, checked, onChange }) {
  return (
    <label className={CHECKBOX_LABEL}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="rounded border-outline-variant/30 text-primary focus:ring-primary/20"
      />
      <span>{name}</span>
    </label>
  );
}
