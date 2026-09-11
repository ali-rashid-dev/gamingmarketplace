import type { ReactNode } from "react";

export function AuthSuccess({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-patina/50 bg-patina/12">
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          className="h-5 w-5 text-patina"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M4.5 12.5 9.5 17.5 19.5 7" />
        </svg>
      </div>
      <h2 className="mt-5 font-display text-2xl text-foreground">{title}</h2>
      <p className="mx-auto mt-2.5 max-w-xs text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
      {children ? <div className="mt-7">{children}</div> : null}
    </div>
  );
}
