"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { moderateReportedReview } from "./actions";

type Report = {
  id: string;
  reason: string;
  details: string | null;
  createdAt: Date;
  reporter: { name: string };
  review: {
    id: string;
    rating: number;
    comment: string | null;
    status: string;
    buyer: { name: string };
    seller: { shopName: string };
  };
};

function ReportCard({ report }: { report: Report }) {
  const [error, setError] = useState("");
  const [busy, startTransition] = useTransition();

  function decide(decision: "hide" | "publish" | "resolve" | "dismiss") {
    setError("");
    startTransition(async () => {
      try {
        const result = await moderateReportedReview(report.id, decision);
        if (!result.success) throw new Error(result.error);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Unable to update report");
      }
    });
  }

  return (
    <article className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap justify-between gap-2">
        <p className="font-semibold">{report.reason.replaceAll("_", " ")}</p>
        <time className="text-xs text-muted-foreground">
          {report.createdAt.toLocaleDateString("en", { dateStyle: "medium", timeZone: "UTC" })}
        </time>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Reported by {report.reporter.name} · Seller {report.review.seller.shopName}
      </p>
      <div className="mt-4 rounded-lg border border-border p-3">
        <p className="text-sm font-semibold">
          {report.review.rating}/5 · {report.review.buyer.name} · {report.review.status.toLowerCase()}
        </p>
        <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
          {report.review.comment || "No written feedback."}
        </p>
      </div>
      {report.details && <p className="mt-3 whitespace-pre-wrap text-sm">{report.details}</p>}
      {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        {report.review.status === "PUBLISHED" ? (
          <Button type="button" size="sm" variant="destructive" disabled={busy} onClick={() => decide("hide")}>
            Hide review
          </Button>
        ) : (
          <Button type="button" size="sm" disabled={busy} onClick={() => decide("publish")}>
            Restore review
          </Button>
        )}
        <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => decide("resolve")}>
          Resolve report
        </Button>
        <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => decide("dismiss")}>
          Dismiss report
        </Button>
      </div>
    </article>
  );
}

export function ReviewReportQueue({ reports }: { reports: Report[] }) {
  if (!reports.length) {
    return (
      <p className="mt-6 rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
        No review reports are awaiting moderation.
      </p>
    );
  }
  return <div className="mt-6 space-y-4">{reports.map((report) => <ReportCard key={report.id} report={report} />)}</div>;
}
