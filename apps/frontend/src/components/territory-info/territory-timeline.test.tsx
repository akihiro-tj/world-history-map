import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { KeyEvent } from '@/domain/territory/types';
import { createHistoricalYear } from '@/domain/year/historical-year';
import { TerritoryTimeline } from './territory-timeline';

describe('TerritoryTimeline', () => {
  const sampleEvents: KeyEvent[] = [
    { year: 1643, event: 'ルイ14世即位' },
    { year: 1661, event: '親政開始' },
    { year: 1682, event: 'ヴェルサイユ宮殿完成' },
    { year: 1700, event: '選択年のイベント' },
    { year: 1701, event: 'スペイン継承戦争勃発' },
    { year: 1789, event: 'フランス革命' },
  ];

  it('applies opacity styling to past events', () => {
    render(
      <TerritoryTimeline keyEvents={sampleEvents} selectedYear={createHistoricalYear(1700)} />,
    );

    const list = screen.getByRole('list');
    const items = within(list).getAllByRole('listitem');

    const pastItems = items.filter((item) => !item.getAttribute('aria-current'));
    const pastItem = pastItems.find((item) => item.textContent?.includes('1643'));
    expect(pastItem?.className).toMatch(/opacity/);
  });

  it('applies aria-current="true" and bold styling to current events', () => {
    render(
      <TerritoryTimeline keyEvents={sampleEvents} selectedYear={createHistoricalYear(1700)} />,
    );

    const list = screen.getByRole('list');
    const items = within(list).getAllByRole('listitem');
    const currentItem = items.find((item) => item.textContent?.includes('1700'));

    expect(currentItem).toHaveAttribute('aria-current', 'true');
    expect(currentItem?.className).toMatch(/font-semibold|font-bold/);
  });

  it('applies opacity to future events', () => {
    render(
      <TerritoryTimeline keyEvents={sampleEvents} selectedYear={createHistoricalYear(1700)} />,
    );

    const list = screen.getByRole('list');
    const items = within(list).getAllByRole('listitem');
    const futureItem = items.find((item) => item.textContent?.includes('1789'));

    expect(futureItem?.className).toMatch(/opacity/);
  });

  it('inserts a current-year placeholder row when no exact event matches', () => {
    const eventsNoMatch: KeyEvent[] = [
      { year: 1643, event: 'ルイ14世即位' },
      { year: 1789, event: 'フランス革命' },
    ];

    render(
      <TerritoryTimeline keyEvents={eventsNoMatch} selectedYear={createHistoricalYear(1700)} />,
    );

    const list = screen.getByRole('list');
    const items = within(list).getAllByRole('listitem');
    const placeholder = items.find((item) => item.getAttribute('aria-current') === 'true');

    expect(placeholder).toBeInTheDocument();
    expect(placeholder?.textContent).toContain('1700');
    expect(placeholder?.textContent).toContain('現在');
  });

  it('renders nothing when keyEvents is undefined', () => {
    const { container } = render(
      <TerritoryTimeline keyEvents={undefined} selectedYear={createHistoricalYear(1700)} />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders a semantic <ol> with aria-label', () => {
    render(
      <TerritoryTimeline keyEvents={sampleEvents} selectedYear={createHistoricalYear(1700)} />,
    );

    const list = screen.getByRole('list');
    expect(list.tagName).toBe('OL');
    expect(list).toHaveAttribute('aria-label', '主な出来事');
  });

  it('places placeholder row last when all events are past', () => {
    const pastEvents: KeyEvent[] = [
      { year: 1600, event: '過去A' },
      { year: 1650, event: '過去B' },
    ];

    render(<TerritoryTimeline keyEvents={pastEvents} selectedYear={createHistoricalYear(1700)} />);

    const list = screen.getByRole('list');
    const items = within(list).getAllByRole('listitem');
    const lastItem = items[items.length - 1];

    expect(lastItem).toHaveAttribute('aria-current', 'true');
    expect(lastItem?.textContent).toContain('現在');
  });

  it('places placeholder row first when all events are future', () => {
    const futureEvents: KeyEvent[] = [
      { year: 1800, event: '未来A' },
      { year: 1900, event: '未来B' },
    ];

    render(
      <TerritoryTimeline keyEvents={futureEvents} selectedYear={createHistoricalYear(1700)} />,
    );

    const list = screen.getByRole('list');
    const items = within(list).getAllByRole('listitem');
    const firstItem = items[0];

    expect(firstItem).toHaveAttribute('aria-current', 'true');
    expect(firstItem?.textContent).toContain('現在');
  });
});
