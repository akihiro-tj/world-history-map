import type { RegionCard as RegionCardType } from '@/domain/era-summary/types';
import { SummaryReferences } from './summary-references';

interface RegionCardProps {
  regionCard: RegionCardType;
  className?: string;
}

export function RegionCard({ regionCard, className }: RegionCardProps) {
  return (
    <article className={className}>
      <h3 className="text-section-heading text-text-primary">{regionCard.title}</h3>
      <SummaryReferences context={regionCard.context} references={regionCard.references} />
    </article>
  );
}
