import type { RegionCard as RegionCardType } from '@/domain/era-summary/types';
import { SummaryReferences } from './summary-references';

interface RegionCardProps {
  regionCard: RegionCardType;
  className?: string;
}

export function RegionCard({ regionCard, className }: RegionCardProps) {
  return (
    <article className={className}>
      <h3 className="text-card-title text-text-primary">{regionCard.title}</h3>
      {regionCard.references.length > 0 ? (
        <SummaryReferences context={regionCard.context} references={regionCard.references} />
      ) : (
        <p className="mt-1 text-body-sm leading-relaxed text-text-secondary">
          {regionCard.context}
        </p>
      )}
    </article>
  );
}
