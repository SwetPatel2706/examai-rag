import React from 'react';
import { cn } from '@/lib/utils';
import { MaterialTypeIcon } from './MaterialTypeIcon';
import { Pagination } from '@/components/ui/pagination';

function OwnerCell({ owner, avatarUrl }) {
  return (
    <div className="flex items-center gap-1.5">
      {avatarUrl ? (
        <img src={avatarUrl} alt={owner} className="w-5 h-5 rounded-full object-cover" />
      ) : (
        <span className="material-symbols-outlined text-[20px] text-on-surface-variant">
          account_circle
        </span>
      )}
      <span className="text-label-sm font-label-sm text-on-surface-variant">{owner}</span>
    </div>
  );
}

function MaterialRow({ material }) {
  return (
    <tr className="hover:bg-surface-container-lowest transition-colors group">
      <td className="px-md py-2">
        <div className="flex items-center gap-2">
          <MaterialTypeIcon type={material.type} />
          <span className="font-body-md text-body-md text-on-surface truncate">{material.name}</span>
        </div>
      </td>
      <td className="px-md py-2 text-label-md font-label-md text-on-surface-variant">
        {material.course}
      </td>
      <td className="px-md py-2 text-label-md font-label-md text-on-surface-variant">
        {material.dateAdded}
      </td>
      <td className="px-md py-2 text-label-md font-label-md text-on-surface-variant">
        {material.size}
      </td>
      <td className="px-md py-2">
        <OwnerCell owner={material.owner} avatarUrl={material.ownerAvatarUrl} />
      </td>
      <td className="px-md py-2 text-right">
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            className="p-1.5 hover:bg-surface-container rounded text-on-surface-variant"
            aria-label={`Download ${material.name}`}
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
          </button>
          <button
            type="button"
            className="p-1.5 hover:bg-surface-container rounded text-on-surface-variant"
            aria-label={`More actions for ${material.name}`}
          >
            <span className="material-symbols-outlined text-[18px]">more_vert</span>
          </button>
        </div>
      </td>
    </tr>
  );
}

const TABLE_HEADERS = ['Name', 'Course', 'Date Added', 'Size', 'Owner', ''];

/**
 * Dense materials table with optional pagination footer.
 */
export function MaterialsTable({
  materials,
  pagination,
  className,
}) {
  return (
    <div className={cn('bg-white rounded-xl ambient-shadow border border-outline-variant/10 overflow-hidden', className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-left dense-table">
          <thead className="bg-surface-container-low border-b border-outline-variant/10">
            <tr>
              {TABLE_HEADERS.map((col) => (
                <th
                  key={col || 'actions'}
                  className={cn(
                    'px-md py-2 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider',
                    col === 'Name' && 'w-1/3'
                  )}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/5">
            {materials.map((material) => (
              <MaterialRow key={material.id} material={material} />
            ))}
          </tbody>
        </table>
      </div>
      {pagination && <Pagination {...pagination} />}
    </div>
  );
}
