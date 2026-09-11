import { Spinner } from "./PrimaryAuthButton";

export function GoogleAuthButton({
  loading,
  onClick,
}: {
  loading?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      aria-busy={loading || undefined}
      className="inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-md border border-border bg-background text-sm font-medium text-foreground transition-colors duration-200 hover:border-gold/50 hover:bg-secondary active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:ring-offset-2 focus-visible:ring-offset-card disabled:cursor-not-allowed disabled:opacity-70"
    >
      {loading ? (
        <>
          <Spinner />
          Connecting...
        </>
      ) : (
        <>
          <svg viewBox="0 0 18 18" aria-hidden="true" className="h-[18px] w-[18px]">
            <path
              fill="#4285F4"
              d="M17.64 9.2c0-.64-.06-1.25-.17-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.62Z"
            />
            <path
              fill="#34A853"
              d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.81.54-1.84.86-3.05.86-2.35 0-4.34-1.58-5.05-3.71H.96v2.34A9 9 0 0 0 9 18Z"
            />
            <path
              fill="#FBBC05"
              d="M3.95 10.71a5.4 5.4 0 0 1 0-3.42V4.95H.96a9 9 0 0 0 0 8.1l2.99-2.34Z"
            />
            <path
              fill="#EA4335"
              d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.59C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l2.99 2.34C4.66 5.16 6.65 3.58 9 3.58Z"
            />
          </svg>
          Continue with Google
        </>
      )}
    </button>
  );
}
