import { create } from 'zustand';

const useMaterialScopeStore = create((set, get) => ({
  // Map of materialId → true (selected). Resets per subject switch.
  selectedIds: new Set(),

  toggleMaterial: (id) =>
    set((s) => {
      const next = new Set(s.selectedIds);
      next.has(id) ? next.delete(id) : next.add(id);
      return { selectedIds: next };
    }),

  selectAll: (ids) => set({ selectedIds: new Set(ids) }),

  deselectAll: () => set({ selectedIds: new Set() }),

  reset: () => set({ selectedIds: new Set() }),

  isSelected: (id) => get().selectedIds.has(id),

  getSelectedArray: () => [...get().selectedIds],
}));

export default useMaterialScopeStore;
