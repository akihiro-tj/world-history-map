import type { TerritoryProfile as TerritoryProfileType } from '@/domain/territory/types';
import { PROFILE_FIELD_LABELS, PROFILE_FIELD_ORDER } from '@/domain/territory/types';

export function TerritoryProfile({ profile }: { profile: TerritoryProfileType | undefined }) {
  if (!profile) return null;

  const entries = PROFILE_FIELD_ORDER.filter((field) => profile[field] != null);

  if (entries.length === 0) return null;

  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
      {entries.map((field) => (
        <div key={field} className="contents">
          <dt className="text-gray-400">{PROFILE_FIELD_LABELS[field]}</dt>
          <dd className="text-white">{profile[field]}</dd>
        </div>
      ))}
    </dl>
  );
}
