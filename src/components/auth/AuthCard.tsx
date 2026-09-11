import type { ReactNode } from "react";

export function AuthCard({ children }: { children: ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card px-6 py-8 shadow-vault sm:px-9 sm:py-10">
      {children}
    </section>
  );
}
