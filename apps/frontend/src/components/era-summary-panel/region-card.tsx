import type { RegionCard as RegionCardType } from '@/domain/era-summary/types';
import { SummaryReferences } from './summary-references';

interface RegionCardProps {
  regionCard: RegionCardType;
  className?: string;
}

export function RegionCard({ regionCard, className }: RegionCardProps) {
  return (
    <article className={className}>
      <h3 className="text-sm font-semibold text-white">{regionCard.title}</h3>
      {regionCard.references.length > 0 ? (
        <SummaryReferences context={regionCard.context} references={regionCard.references} />
      ) : (
        <p className="mt-1 text-sm leading-relaxed text-gray-300">{regionCard.context}</p>
      )}
    </article>
  );
}
