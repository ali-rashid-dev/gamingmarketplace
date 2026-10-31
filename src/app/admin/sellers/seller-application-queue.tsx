"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Link from "next/link";
import { reviewSellerApplication } from "../seller-actions";

type SellerApplication = {
  id: string;
  shopName: string;
  description: string | null;
  createdAt: Date;
  user: { name: string; email: string };
};

function ApplicationCard({ application }: { application: SellerApplication }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, startTransition] = useTransition();

  function decide(status: "APPROVED" | "REJECTED") {
    setError("");
    startTransition(async () => {
      try {
        const result = await reviewSellerApplication(application.id, status);
        if (!result.success) throw new Error(result.error);
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Unable to review application");
      }
    });
  }

  return (
    <article className="rounded-xl border border-border bg-card p-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="min-w-0">
          <h2 className="break-words font-display text-lg font-semibold">{application.shopName}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {application.user.name} · {application.user.email}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Applied {application.createdAt.toLocaleDateString("en-US", { timeZone: "UTC" })}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => decide("APPROVED")}
            className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            Approve
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => decide("REJECTED")}
            className="rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50"
          >
            Reject
          </button>
        </div>
      </div>
      {application.description && (
        <p className="mt-4 whitespace-pre-line text-sm leading-6 text-muted-foreground">{application.description}</p>
      )}
      {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
    </article>
  );
}

export function SellerApplicationQueue({
  applications,
  page,
  pageSize,
  totalApplications,
  totalPages,
}: {
  applications: SellerApplication[];
  page: number;
  pageSize: number;
  totalApplications: number;
  totalPages: number;
}) {
  const firstApplication = totalApplications === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastApplication = Math.min(page * pageSize, totalApplications);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Seller management</p>
      <h1 className="mt-2 font-display text-2xl font-semibold sm:text-3xl">Seller applications</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Review shop applications and approve or reject seller verification.
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Showing {firstApplication}–{lastApplication} of {totalApplications} pending applications
        </p>
        <nav aria-label="Seller application pages" className="flex items-center gap-2">
          {page > 1 ? (
            <Link
              href={`/admin/sellers?page=${page - 1}`}
              className="rounded-md border border-border px-3 py-2 text-sm hover:bg-accent"
            >
              Previous
            </Link>
          ) : (
            <span aria-disabled="true" className="rounded-md border border-border px-3 py-2 text-sm text-muted-foreground opacity-50">
              Previous
            </span>
          )}
          <span aria-current="page" className="px-2 text-sm tabular-nums text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          {page < totalPages ? (
            <Link
              href={`/admin/sellers?page=${page + 1}`}
              className="rounded-md border border-border px-3 py-2 text-sm hover:bg-accent"
            >
              Next
            </Link>
          ) : (
            <span aria-disabled="true" className="rounded-md border border-border px-3 py-2 text-sm text-muted-foreground opacity-50">
              Next
            </span>
          )}
        </nav>
      </div>
      {applications.length ? (
        <div className="mt-6 space-y-3">
          {applications.map((application) => (
            <ApplicationCard key={application.id} application={application} />
          ))}
        </div>
      ) : (
        <p className="mt-6 rounded-lg border border-dashed border-border p-8 text-sm text-muted-foreground">
          No seller applications are awaiting review.
        </p>
      )}
    </main>
  );
}
