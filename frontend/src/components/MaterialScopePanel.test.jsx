import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MaterialScopePanel from './MaterialScopePanel';
import useMaterialScopeStore from '@/store/materialScopeStore';

const MATERIALS = [
  {
    teacher: { id: 't1', name: 'Dr. Vance' },
    materials: [
      { id: 'm1', name: 'Arrays.pdf', type: 'PDF' },
      { id: 'm2', name: 'Linked Lists.pdf', type: 'PDF' },
    ],
  },
  {
    teacher: { id: 't2', name: 'Dr. Nair' },
    materials: [{ id: 'm3', name: 'Graphs.pptx', type: 'PPTX' }],
  },
];

describe('MaterialScopePanel', () => {
  beforeEach(() => {
    useMaterialScopeStore.getState().reset();
  });

  it('groups materials by teacher', () => {
    render(<MaterialScopePanel materialsByTeacher={MATERIALS} />);
    expect(screen.getByText('Dr. Vance')).toBeInTheDocument();
    expect(screen.getByText('Dr. Nair')).toBeInTheDocument();
    expect(screen.getByText('Arrays.pdf')).toBeInTheDocument();
    expect(screen.getByText('Graphs.pptx')).toBeInTheDocument();
  });

  it('toggles a material checkbox into the store', async () => {
    const user = userEvent.setup();
    render(<MaterialScopePanel materialsByTeacher={MATERIALS} />);

    const checkbox = screen.getByLabelText(/Arrays\.pdf/);
    await user.click(checkbox);

    expect(useMaterialScopeStore.getState().isSelected('m1')).toBe(true);
  });

  it('selects all then deselects all', async () => {
    const user = userEvent.setup();
    render(<MaterialScopePanel materialsByTeacher={MATERIALS} />);

    await user.click(screen.getByRole('button', { name: 'Select All' }));
    expect(useMaterialScopeStore.getState().getSelectedArray().sort()).toEqual(['m1', 'm2', 'm3']);

    await user.click(screen.getByRole('button', { name: 'Deselect All' }));
    expect(useMaterialScopeStore.getState().getSelectedArray()).toEqual([]);
  });

  it('shows an empty message when there are no materials', () => {
    render(<MaterialScopePanel materialsByTeacher={[]} />);
    expect(screen.getByText('No materials available for this subject.')).toBeInTheDocument();
  });
});
