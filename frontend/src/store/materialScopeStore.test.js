import { describe, it, expect, beforeEach } from 'vitest';
import useMaterialScopeStore from './materialScopeStore';

describe('materialScopeStore', () => {
  beforeEach(() => {
    useMaterialScopeStore.getState().reset();
  });

  it('toggles individual material ids', () => {
    const store = useMaterialScopeStore.getState();
    expect(store.isSelected('m1')).toBe(false);

    store.toggleMaterial('m1');
    expect(useMaterialScopeStore.getState().isSelected('m1')).toBe(true);

    store.toggleMaterial('m1');
    expect(useMaterialScopeStore.getState().isSelected('m1')).toBe(false);
  });

  it('selectAll/deselectAll and getSelectedArray', () => {
    const store = useMaterialScopeStore.getState();
    store.selectAll(['m1', 'm2', 'm3']);

    expect(useMaterialScopeStore.getState().getSelectedArray().sort()).toEqual(['m1', 'm2', 'm3']);

    store.toggleMaterial('m2');
    expect(useMaterialScopeStore.getState().getSelectedArray().sort()).toEqual(['m1', 'm3']);

    store.deselectAll();
    expect(useMaterialScopeStore.getState().getSelectedArray()).toEqual([]);
  });
});
