import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ProjectionProvider } from '../../contexts/projection-context';

vi.mock('../map/projection-toggle', () => ({
  ProjectionToggle: vi.fn((props) => (
    <button type="button" data-testid="projection-toggle" onClick={() => props.onToggle('globe')}>
      projection
    </button>
  )),
}));

import { ControlBar } from './control-bar';

function renderWithProvider(ui: React.ReactElement) {
  return render(<ProjectionProvider>{ui}</ProjectionProvider>);
}

describe('ControlBar', () => {
  const defaultProps = {
    onOpenLicense: vi.fn(),
  };

  it('renders projection toggle', () => {
    renderWithProvider(<ControlBar {...defaultProps} />);
    expect(screen.getByTestId('projection-toggle')).toBeInTheDocument();
  });

  it('renders license button', () => {
    renderWithProvider(<ControlBar {...defaultProps} />);
    expect(screen.getByTestId('license-link')).toBeInTheDocument();
  });

  it('renders GitHub link', () => {
    renderWithProvider(<ControlBar {...defaultProps} />);
    expect(screen.getByTestId('github-link')).toBeInTheDocument();
  });

  it('calls onOpenLicense when license button is clicked', () => {
    renderWithProvider(<ControlBar {...defaultProps} />);
    fireEvent.click(screen.getByTestId('license-link'));
    expect(defaultProps.onOpenLicense).toHaveBeenCalledOnce();
  });

  it('passes projection to ProjectionToggle', () => {
    renderWithProvider(<ControlBar {...defaultProps} />);
    fireEvent.click(screen.getByTestId('projection-toggle'));
  });

  it('has correct GitHub link href', () => {
    renderWithProvider(<ControlBar {...defaultProps} />);
    const link = screen.getByTestId('github-link');
    expect(link).toHaveAttribute('href', 'https://github.com/akihiro-tj/world-history-map');
    expect(link).toHaveAttribute('target', '_blank');
  });
});
