import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TerritoryContext } from './territory-context';

describe('TerritoryContext', () => {
  const sampleContext =
    '1700年のフランスはルイ14世の親政期にあり、ヨーロッパ最大の人口約2000万人を擁した。翌1701年にはスペイン継承戦争が勃発する。';

  it('displays context text when provided', () => {
    render(<TerritoryContext context={sampleContext} />);

    expect(screen.getByText(sampleContext)).toBeInTheDocument();
  });

  it('renders nothing when context is undefined', () => {
    const { container } = render(<TerritoryContext context={undefined} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders text as a paragraph element', () => {
    render(<TerritoryContext context={sampleContext} />);

    const paragraph = screen.getByText(sampleContext);
    expect(paragraph.tagName).toBe('P');
  });
});
