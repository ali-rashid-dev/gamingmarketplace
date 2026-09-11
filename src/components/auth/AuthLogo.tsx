export function AuthLogo() {
  return (
    <div className="flex items-center justify-center gap-2.5">
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="h-7 w-7 text-gold"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      >
        <path d="M12 2.5 20.5 6v6.2c0 5-3.6 8.3-8.5 9.3-4.9-1-8.5-4.3-8.5-9.3V6L12 2.5Z" />
        <circle cx="12" cy="11.5" r="3.4" />
        <path d="M12 5.6v2.2M12 15.2v2.2M6.4 11.5h2.2M15.4 11.5h2.2" />
      </svg>
      <span className="font-display text-xl font-bold tracking-[0.2em] text-foreground uppercase">
        Game<span className="text-gold">Trade</span>
      </span>
    </div>
  );
}
