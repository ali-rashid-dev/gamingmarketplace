import { getSupportProfile } from "../data";
import { SupportProfileControls } from "./support-profile-controls";

export default async function SupportProfilePage() {
  const profile = await getSupportProfile();
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Agent settings</p>
      <h1 className="mt-2 font-display text-2xl font-semibold sm:text-3xl">My profile</h1>
      <p className="mt-2 text-sm text-muted-foreground">Manage customer assignment availability and review your current workload.</p>
      <SupportProfileControls
        name={profile.user.name ?? "Support agent"}
        email={profile.user.email ?? ""}
        role={profile.user.role ?? "SUPPORT"}
        isAvailable={profile.isAvailable}
        assignedOpenTickets={profile.assignedOpenTickets}
      />
    </main>
  );
}
