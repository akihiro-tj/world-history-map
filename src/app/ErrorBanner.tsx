type ErrorBannerProps = { message: string };

export function ErrorBanner({ message }: ErrorBannerProps) {
  return (
    <p
      role="alert"
      className="rounded-sm bg-error-surface p-sm text-label text-on-error-surface shadow-md"
    >
      {message}
    </p>
  );
}
