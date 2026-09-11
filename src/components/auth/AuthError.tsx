export function AuthError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      className="flex items-start gap-2.5 rounded-md border border-destructive/45 bg-destructive/10 px-3.5 py-3 text-xs leading-relaxed text-destructive-foreground"
    >
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="mt-px h-4 w-4 shrink-0 text-destructive"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v4.5M12 16h.01" />
      </svg>
      {message}
    </div>
  );
}
