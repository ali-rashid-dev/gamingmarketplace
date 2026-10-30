import Link from "next/link";
import { requirePageSession } from "@/lib/authorization";
import { getBuyerSessions } from "../buyer-data";
import { SessionControls } from "./session-controls";

export default async function BuyerSecurityPage() {
  const { user, session } = await requirePageSession();
  const sessions = await getBuyerSessions(user.id, session.id);
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-patina">Account protection</p>
      <h1 className="mt-2 font-display text-3xl font-semibold">Security</h1>
      <p className="mt-2 text-sm text-muted-foreground">Review active sessions and reset your password.</p>
      <section className="mt-6 rounded-xl border border-border bg-card p-4 sm:p-6">
        <h2 className="font-display text-xl font-semibold">Password</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">Use a secure password and never reuse it on other services. Password recovery uses a one-time email link.</p>
        <Link href="/forgot-password" className="mt-4 inline-flex min-h-10 w-full items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground sm:w-auto">Reset password</Link>
      </section>
      <SessionControls sessions={sessions} />
    </div>
  );
}
