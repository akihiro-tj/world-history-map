import { cn } from '@/lib/utils';

export const SELECTED_ACCENT_CLASS = 'border-l-4 border-role-selected';

export function SelectedAccent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn(SELECTED_ACCENT_CLASS, className)}>{children}</div>;
}
