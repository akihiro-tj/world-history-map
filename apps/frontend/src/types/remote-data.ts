export type RemoteData<T> =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'empty' }
  | { kind: 'loaded'; data: T };

export function toRemoteData<T>({
  data,
  isLoading,
  error,
}: {
  data: T | null;
  isLoading: boolean;
  error: string | null;
}): RemoteData<T> {
  if (isLoading) return { kind: 'loading' };
  if (error) return { kind: 'error', message: error };
  if (!data) return { kind: 'empty' };
  return { kind: 'loaded', data };
}
