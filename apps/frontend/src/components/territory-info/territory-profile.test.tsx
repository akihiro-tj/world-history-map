import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { TerritoryProfile as TerritoryProfileType } from '@/types/territory';
import { PROFILE_FIELD_LABELS, PROFILE_FIELD_ORDER } from '@/types/territory';
import { TerritoryProfile } from './territory-profile';

describe('TerritoryProfile', () => {
  const fullProfile: TerritoryProfileType = {
    capital: 'パリ',
    regime: '絶対王政',
    dynasty: 'ブルボン朝',
    leader: 'ルイ14世',
    religion: 'カトリック',
  };

  it('displays all 5 fields in correct order (capital → regime → dynasty → leader → religion)', () => {
    render(<TerritoryProfile profile={fullProfile} />);

    const terms = screen.getAllByRole('term');
    const definitions = screen.getAllByRole('definition');

    expect(terms).toHaveLength(5);
    expect(definitions).toHaveLength(5);

    for (const [i, field] of PROFILE_FIELD_ORDER.entries()) {
      expect(terms[i]).toHaveTextContent(PROFILE_FIELD_LABELS[field]);
      const value = fullProfile[field];
      expect(value).toBeDefined();
      expect(definitions[i]).toHaveTextContent(value as string);
    }
  });

  it('displays only existing fields for partial profile', () => {
    const partialProfile: TerritoryProfileType = {
      capital: 'ゴンダール',
    };

    render(<TerritoryProfile profile={partialProfile} />);

    const terms = screen.getAllByRole('term');
    const definitions = screen.getAllByRole('definition');

    expect(terms).toHaveLength(1);
    expect(definitions).toHaveLength(1);
    expect(terms[0]).toHaveTextContent('首都');
    expect(definitions[0]).toHaveTextContent('ゴンダール');
  });

  it('renders nothing when profile is undefined', () => {
    const { container } = render(<TerritoryProfile profile={undefined} />);
    expect(container.innerHTML).toBe('');
  });

  it('uses labels matching PROFILE_FIELD_LABELS', () => {
    render(<TerritoryProfile profile={fullProfile} />);

    for (const field of PROFILE_FIELD_ORDER) {
      expect(screen.getByText(PROFILE_FIELD_LABELS[field])).toBeInTheDocument();
    }
  });
});
