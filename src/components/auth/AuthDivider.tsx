export function AuthDivider({ label = "OR" }: { label?: string }) {
  return (
    <div className="flex items-center gap-4" role="separator">
      <span className="h-px flex-1 bg-border" />
      <span className="text-[0.68rem] font-medium tracking-[0.22em] text-muted-foreground">
        {label}
      </span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}
