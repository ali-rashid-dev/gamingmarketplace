"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { MessageAttachmentList } from "@/app/dashboard/messages/message-controls";
import { moderateConversationReport } from "../actions";

type Report = Awaited<ReturnType<typeof import("../data").getConversationReports>>[number];

function ReportCard({ report }: { report: Report }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, startTransition] = useTransition();

  function decide(decision: "resolve" | "dismiss") {
    setError("");
    startTransition(async () => {
      try {
        const result = await moderateConversationReport(report.id, decision);
        if (!result.success) throw new Error(result.error);
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Unable to update conversation report");
      }
    });
  }

  return (
    <article className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">{report.reason.replaceAll("_", " ")}</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Reported by {report.reporter.name} ({report.reporter.email})
          </p>
        </div>
        <time className="text-xs text-muted-foreground">{report.createdAt.toLocaleString()}</time>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        {report.conversation.order
          ? `Order ${report.conversation.order.orderNumber}`
          : "Marketplace conversation"} · Buyer {report.conversation.buyer.name} · Seller {report.conversation.seller.name}
      </p>
      {report.details && <p className="mt-3 whitespace-pre-wrap text-sm">{report.details}</p>}
      <div className="mt-4 space-y-3 border-t border-border pt-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Recent messages
        </h3>
        {report.conversation.messages.length ? report.conversation.messages.map((message) => (
          <div key={message.id} className="rounded-lg border border-border p-3">
            <p className="text-xs font-medium">{message.sender.name}</p>
            <p className="mt-1 whitespace-pre-wrap break-words text-sm">{message.body}</p>
            <MessageAttachmentList attachments={message.attachments} />
            <time className="mt-2 block text-[10px] text-muted-foreground">{message.createdAt.toLocaleString()}</time>
          </div>
        )) : (
          <p className="text-sm text-muted-foreground">No messages in this conversation.</p>
        )}
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" size="sm" disabled={busy} onClick={() => decide("resolve")}>
          Resolve
        </Button>
        <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => decide("dismiss")}>
          Dismiss
        </Button>
      </div>
    </article>
  );
}

export function ConversationReportQueue({ reports }: { reports: Report[] }) {
  if (!reports.length) {
    return (
      <p className="mt-6 rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
        No conversation reports are awaiting review.
      </p>
    );
  }
  return <div className="mt-6 space-y-4">{reports.map((report) => <ReportCard key={report.id} report={report} />)}</div>;
}
