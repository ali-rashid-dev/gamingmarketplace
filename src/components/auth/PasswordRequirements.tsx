import { cn } from "@/lib/utils";

export function PasswordRequirements({ value = "" }: { value?: string }) {
  const requirements = [
    { label: "At least 8 characters", valid: value.length >= 8 },
    { label: "Contains a number or symbol", valid: /[\d\W]/.test(value) },
    { label: "Contains uppercase letter", valid: /[A-Z]/.test(value) },
  ];

  return (
    <div className="space-y-1.5 pt-1">
      <p className="text-[0.7rem] font-medium uppercase tracking-wider text-muted-foreground">
        Password Requirements
      </p>
      <div className="grid grid-cols-1 gap-1 sm:grid-cols-3">
        {requirements.map((req, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div
              className={cn(
                "flex h-3.5 w-3.5 items-center justify-center rounded-full border transition-colors duration-200",
                req.valid
                  ? "border-patina/80 bg-patina/20 text-patina"
                  : "border-border bg-muted/40 text-transparent"
              )}
            >
              <svg viewBox="0 0 24 24" className="h-2.5 w-2.5 stroke-[3]" fill="none" stroke="currentColor">
                <path d="M4.5 12.5 9.5 17.5 19.5 7" />
              </svg>
            </div>
            <span
              className={cn(
                "text-[0.7rem] transition-colors duration-200",
                req.valid ? "text-foreground font-medium" : "text-muted-foreground"
              )}
            >
              {req.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
