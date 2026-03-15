import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { formatYear } from '@/utils/format-year';

const FADE_DURATION_MS = 150;

interface YearDisplayProps {
  year: number;
}

export function YearDisplay({ year }: YearDisplayProps) {
  const [displayYear, setDisplayYear] = useState(year);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (year === displayYear) return;
    setVisible(false);
    const id = setTimeout(() => {
      setDisplayYear(year);
      setVisible(true);
    }, FADE_DURATION_MS);
    return () => clearTimeout(id);
  }, [year, displayYear]);

  return (
    <div
      aria-live="polite"
      className={cn(
        'rounded-lg bg-gray-800/80 px-4 py-2 text-3xl font-bold text-white shadow-lg backdrop-blur-sm transition-opacity duration-150',
        visible ? 'opacity-100' : 'opacity-0',
      )}
    >
      {formatYear(displayYear)}
    </div>
  );
}
