import React from 'react';
import { MaterialTypeIcon } from './MaterialTypeIcon';

export function RecentlyAccessedCard({ name, accessedAt, type, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="bg-white p-sp-xs pr-sp-sm rounded-lg ambient-shadow card-hover flex items-center gap-3 group cursor-pointer border border-outline-variant/10 text-left w-full"
    >
      <MaterialTypeIcon type={type} variant="boxed" />
      <div className="min-w-0">
        <p className="font-label-md text-label-md text-on-surface truncate">{name}</p>
        <p className="text-on-surface-variant text-label-sm font-label-sm truncate">{accessedAt}</p>
      </div>
    </button>
  );
}
