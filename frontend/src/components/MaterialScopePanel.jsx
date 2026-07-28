import React from 'react';
import { cn } from '@/lib/utils';
import useMaterialScopeStore from '@/store/materialScopeStore';

/**
 * MaterialScopePanel — materials grouped by teacher, with checkboxes.
 * Used in Chat (side panel) and FlashcardDecks (modal body).
 *
 * @param {{ materialsByTeacher: Array<{teacher: {id, name}, materials: Array<{id, name, type}>}> }} props
 */
export default function MaterialScopePanel({ materialsByTeacher, className }) {
  const { selectedIds, toggleMaterial, selectAll, deselectAll, isSelected } = useMaterialScopeStore();

  const allIds = materialsByTeacher.flatMap((g) => g.materials.map((m) => m.id));
  const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.has(id));

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {/* Select All toggle */}
      <div className="flex items-center justify-between">
        <span className="font-label-md text-label-md font-bold text-secondary uppercase tracking-wider">
          Study Materials
        </span>
        <button
          onClick={() => (allSelected ? deselectAll() : selectAll(allIds))}
          className="text-primary font-label-md text-label-md hover:underline"
        >
          {allSelected ? 'Deselect All' : 'Select All'}
        </button>
      </div>

      {materialsByTeacher.map(({ teacher, materials }) => (
        <div key={teacher.id}>
          {/* Teacher name header */}
          <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-2 px-1">
            {teacher.name}
          </p>
          <div className="space-y-1">
            {materials.map((mat) => {
              const checked = isSelected(mat.id);
              return (
                <label
                  key={mat.id}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer transition-colors',
                    checked ? 'bg-primary-fixed/30' : 'hover:bg-surface-container-low'
                  )}
                >
                  <input
                    type="checkbox"
                    className="accent-primary w-4 h-4 rounded"
                    checked={checked}
                    onChange={() => toggleMaterial(mat.id)}
                  />
                  <div className="flex flex-col min-w-0">
                    <span className={cn('font-label-md text-label-md truncate', checked ? 'text-primary font-semibold' : 'text-on-surface')}>
                      {mat.name}
                    </span>
                    <span className="text-[11px] text-secondary uppercase">{mat.type}</span>
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      ))}

      {allIds.length === 0 && (
        <p className="text-on-surface-variant font-body-md text-body-md text-center py-4">
          No materials available for this subject.
        </p>
      )}
    </div>
  );
}
