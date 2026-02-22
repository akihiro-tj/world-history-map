import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../map/projection-toggle', () => ({
  ProjectionToggle: vi.fn((props) => (
    <button type="button" data-testid="projection-toggle" onClick={() => props.onToggle('globe')}>
      projection
    </button>
  )),
}));

import { ControlBar } from './control-bar';

describe('ControlBar', () => {
  const defaultProps = {
    projection: 'mercator' as const,
    onToggleProjection: vi.fn(),
    onOpenLicense: vi.fn(),
  };

  it('renders projection toggle', () => {
    render(<ControlBar {...defaultProps} />);
    expect(screen.getByTestId('projection-toggle')).toBeInTheDocument();
  });

  it('renders license button', () => {
    render(<ControlBar {...defaultProps} />);
    expect(screen.getByTestId('license-link')).toBeInTheDocument();
  });

  it('renders GitHub link', () => {
    render(<ControlBar {...defaultProps} />);
    expect(screen.getByTestId('github-link')).toBeInTheDocument();
  });

  it('calls onOpenLicense when license button is clicked', () => {
    render(<ControlBar {...defaultProps} />);
    fireEvent.click(screen.getByTestId('license-link'));
    expect(defaultProps.onOpenLicense).toHaveBeenCalledOnce();
  });

  it('passes projection props to ProjectionToggle', () => {
    render(<ControlBar {...defaultProps} />);
    fireEvent.click(screen.getByTestId('projection-toggle'));
    expect(defaultProps.onToggleProjection).toHaveBeenCalledWith('globe');
  });

  it('has correct GitHub link href', () => {
    render(<ControlBar {...defaultProps} />);
    const link = screen.getByTestId('github-link');
    expect(link).toHaveAttribute('href', 'https://github.com/akihiro-tj/world-history-map');
    expect(link).toHaveAttribute('target', '_blank');
  });
});
