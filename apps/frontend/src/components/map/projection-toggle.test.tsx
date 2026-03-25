import { fireEvent, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { ProjectionToggle } from './projection-toggle';

describe('ProjectionToggle', () => {
  it('calls onToggle with globe when current projection is mercator', () => {
    const onToggle = vi.fn();
    render(<ProjectionToggle projection="mercator" onToggle={onToggle} />);

    fireEvent.click(screen.getByRole('button'));

    expect(onToggle).toHaveBeenCalledWith('globe');
  });

  it('calls onToggle with mercator when current projection is globe', () => {
    const onToggle = vi.fn();
    render(<ProjectionToggle projection="globe" onToggle={onToggle} />);

    fireEvent.click(screen.getByRole('button'));

    expect(onToggle).toHaveBeenCalledWith('mercator');
  });

  it('shows aria-label for switching to globe when projection is mercator', () => {
    render(<ProjectionToggle projection="mercator" onToggle={vi.fn()} />);

    expect(screen.getByRole('button')).toHaveAttribute('aria-label', '地球儀表示に切り替え');
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false');
  });

  it('shows aria-label for switching to flat map when projection is globe', () => {
    render(<ProjectionToggle projection="globe" onToggle={vi.fn()} />);

    expect(screen.getByRole('button')).toHaveAttribute('aria-label', '平面地図に切り替え');
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
  });

  it('renders globe icon SVG when projection is mercator', () => {
    const { container } = render(<ProjectionToggle projection="mercator" onToggle={vi.fn()} />);

    const path = container.querySelector('svg path');
    expect(path?.getAttribute('d')).toContain('3.055');
  });

  it('renders map icon SVG when projection is globe', () => {
    const { container } = render(<ProjectionToggle projection="globe" onToggle={vi.fn()} />);

    const path = container.querySelector('svg path');
    expect(path?.getAttribute('d')).toContain('5.447');
  });

  it('forwards ref to the button element', () => {
    const ref = createRef<HTMLButtonElement>();
    render(<ProjectionToggle ref={ref} projection="mercator" onToggle={vi.fn()} />);

    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  it('applies additional className', () => {
    render(<ProjectionToggle projection="mercator" onToggle={vi.fn()} className="custom-class" />);

    expect(screen.getByRole('button').className).toContain('custom-class');
  });
});
