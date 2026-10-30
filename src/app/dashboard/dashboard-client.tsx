"use client";

import { signOut } from "@/lib/auth-client";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface DashboardClientProps {
  name: string;
  email: string;
  role: string;
}

export default function DashboardClient({
  name,
  email,
  role,
}: DashboardClientProps) {
  const router = useRouter();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-center px-5 py-12 sm:px-8">
      <section className="rounded-xl border border-border bg-card p-6 shadow-vault sm:p-9">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-patina">Account</p>
        <h1 className="mt-2 text-3xl font-semibold">Dashboard</h1>
        <p className="mt-2 text-muted-foreground">Welcome, {name || "User"}!</p>
        <dl className="mt-7 grid gap-4 border-t border-border pt-5 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Email</dt>
            <dd className="mt-1 break-all font-medium">{email}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Account role</dt>
            <dd className="mt-1 font-medium">{role}</dd>
          </div>
        </dl>
      {role === "SELLER" && (
        <Link
          href="/seller/listings"
          className="mt-6 w-full rounded-md bg-primary px-4 py-2 text-center font-medium text-primary-foreground transition hover:bg-primary/90"
        >
          Manage seller listings
        </Link>
      )}
      <button
        onClick={() =>
          signOut({
            fetchOptions: {
              onSuccess: () => router.push("/sign-in"),
            },
          })
        }
        className="mt-3 w-full rounded-md border border-border bg-secondary px-4 py-2 font-medium text-secondary-foreground transition hover:bg-accent"
      >
        Sign Out
      </button>
      </section>
    </main>
  );
}
