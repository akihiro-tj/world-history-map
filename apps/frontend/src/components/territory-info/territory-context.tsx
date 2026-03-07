export function TerritoryContext({
  context,
}: {
  context: string | undefined;
}) {
  if (!context) return null;

  return <p className="text-sm leading-relaxed text-gray-300">{context}</p>;
}
