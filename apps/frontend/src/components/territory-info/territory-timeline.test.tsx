import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createHistoricalYear } from '@/types/historical-year';
import type { KeyEvent } from '@/types/territory';
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

  it('applies opacity/muted styling classes to past events', () => {
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

  it('applies dashed/muted style to future events', () => {
    render(
      <TerritoryTimeline keyEvents={sampleEvents} selectedYear={createHistoricalYear(1700)} />,
    );

    const list = screen.getByRole('list');
    const items = within(list).getAllByRole('listitem');
    const futureItem = items.find((item) => item.textContent?.includes('1789'));

    expect(futureItem?.className).toMatch(/opacity/);
    expect(futureItem?.className).toMatch(/dashed|border-dashed/);
  });

  it('shows year marker at the correct position when no exact match event exists', () => {
    const eventsNoMatch: KeyEvent[] = [
      { year: 1643, event: 'ルイ14世即位' },
      { year: 1789, event: 'フランス革命' },
    ];

    render(
      <TerritoryTimeline keyEvents={eventsNoMatch} selectedYear={createHistoricalYear(1700)} />,
    );

    const marker = screen.getByRole('separator');
    expect(marker).toBeInTheDocument();
    expect(marker).toHaveAttribute('aria-label', expect.stringContaining('1700'));
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

  it('places marker at the end when all events are past', () => {
    const pastEvents: KeyEvent[] = [
      { year: 1600, event: '過去A' },
      { year: 1650, event: '過去B' },
    ];

    render(<TerritoryTimeline keyEvents={pastEvents} selectedYear={createHistoricalYear(1700)} />);

    const list = screen.getByRole('list');
    const marker = within(list).getByRole('separator');
    expect(marker).toBeInTheDocument();

    const markerLi = marker.closest('li');
    const children = Array.from(list.children);
    expect(children[children.length - 1]).toBe(markerLi);
  });

  it('places marker at the beginning when all events are future', () => {
    const futureEvents: KeyEvent[] = [
      { year: 1800, event: '未来A' },
      { year: 1900, event: '未来B' },
    ];

    render(
      <TerritoryTimeline keyEvents={futureEvents} selectedYear={createHistoricalYear(1700)} />,
    );

    const list = screen.getByRole('list');
    const marker = within(list).getByRole('separator');
    expect(marker).toBeInTheDocument();

    const markerLi = marker.closest('li');
    const children = Array.from(list.children);
    expect(children[0]).toBe(markerLi);
  });
});
