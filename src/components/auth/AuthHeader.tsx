export function AuthHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="mb-7 text-center">
      <h1 className="font-display text-[1.75rem] font-semibold leading-tight tracking-wide text-foreground sm:text-3xl">
        {title}
      </h1>
      {subtitle ? (
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
      ) : null}
    </header>
  );
}
