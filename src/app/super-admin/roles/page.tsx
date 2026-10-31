const roles = [
  { role: "BUYER", description: "Marketplace buyer account." },
  { role: "SELLER", description: "Approved seller account and seller workspace access." },
  { role: "SUPPORT", description: "Support console access for tickets, reports, and dispute workflows." },
  { role: "ADMIN", description: "Marketplace operations access, including catalog and listing moderation." },
  { role: "SUPER_ADMIN", description: "Platform administration, privileged access management, and audit review." },
];

export default function RoleStructurePage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Access control</p>
      <h1 className="mt-2 font-display text-2xl font-semibold sm:text-3xl">Role structure</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        The application currently enforces fixed account roles. Fine-grained, configurable permissions and mandatory multi-factor or step-up authentication are not implemented.
      </p>
      <div className="mt-6 space-y-3">
        {roles.map(({ role, description }) => (
          <article key={role} className="rounded-xl border border-border bg-card p-4">
            <h2 className="text-sm font-semibold">{role.replaceAll("_", " ")}</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
          </article>
        ))}
      </div>
    </main>
  );
}
