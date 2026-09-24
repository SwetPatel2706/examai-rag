import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import RouteFallback from './RouteFallback';

describe('RouteFallback', () => {
  it('renders an accessible loading fallback while a route chunk loads', () => {
    render(<RouteFallback />);

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });

  it('supports an in-shell fallback without taking over the viewport', () => {
    render(<RouteFallback fullScreen={false} />);

    expect(screen.getByRole('status').parentElement).toHaveClass('min-h-[320px]');
    expect(screen.getByRole('status').parentElement).not.toHaveClass('min-h-screen');
  });
});
