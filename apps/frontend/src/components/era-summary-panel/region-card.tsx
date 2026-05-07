import type { RegionCard as RegionCardType } from '@/domain/era-summary/types';
import { SummaryReferences } from './summary-references';

interface RegionCardProps {
  card: RegionCardType;
  className?: string;
}

export function RegionCard({ card, className }: RegionCardProps) {
  return (
    <article className={className}>
      <h3 className="text-sm font-semibold text-white">{card.title}</h3>
      {card.references.length > 0 ? (
        <SummaryReferences context={card.context} references={card.references} />
      ) : (
        <p className="mt-1 text-sm leading-relaxed text-gray-300">{card.context}</p>
      )}
    </article>
  );
}
