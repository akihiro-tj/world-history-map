/**
 * Loading overlay component
 *
 * Displays a semi-transparent overlay with a loading spinner.
 * Used during year transitions to indicate data loading.
 *
 * @example
 * ```tsx
 * {isLoading && <LoadingOverlay />}
 * ```
 */
export function LoadingOverlay() {
  return (
    <output
      data-testid="loading-overlay"
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/30"
      aria-label="読み込み中"
    >
      <div className="flex flex-col items-center gap-3 rounded-lg bg-white p-6 shadow-lg dark:bg-gray-800">
        <div
          className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"
          aria-hidden="true"
        />
        <span className="text-sm text-gray-600 dark:text-gray-300">データを読み込み中...</span>
      </div>
    </output>
  );
}
