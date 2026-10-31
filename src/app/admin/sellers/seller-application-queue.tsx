"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
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
    const decision = status === "APPROVED" ? "approve this seller and grant seller access" : "reject this seller application";
    if (!window.confirm(`Are you sure you want to ${decision}? This action will be audited.`)) return;
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
          <Button
            type="button"
            size="sm"
            disabled={busy}
            onClick={() => decide("APPROVED")}
          >
            Approve
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => decide("REJECTED")}
          >
            Reject
          </Button>
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
            <Button
              render={<Link href={`/admin/sellers?page=${page - 1}`} />}
              nativeButton={false}
              variant="outline"
              size="sm"
            >
              Previous
            </Button>
          ) : (
            <Button type="button" variant="outline" size="sm" disabled>
              Previous
            </Button>
          )}
          <span aria-current="page" className="px-2 text-sm tabular-nums text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          {page < totalPages ? (
            <Button
              render={<Link href={`/admin/sellers?page=${page + 1}`} />}
              nativeButton={false}
              variant="outline"
              size="sm"
            >
              Next
            </Button>
          ) : (
            <Button type="button" variant="outline" size="sm" disabled>
              Next
            </Button>
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
        <Empty className="mt-6 rounded-lg border">
          <EmptyHeader>
            <EmptyTitle>No pending applications</EmptyTitle>
            <EmptyDescription>No seller applications are awaiting review.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </main>
  );
}
