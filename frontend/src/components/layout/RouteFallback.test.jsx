import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import RouteFallback from './RouteFallback';

describe('RouteFallback', () => {
  it('renders an accessible loading fallback while a route chunk loads', () => {
    render(<RouteFallback />);

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });
});
