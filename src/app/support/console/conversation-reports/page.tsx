import { getConversationReports } from "../data";
import { ConversationReportQueue } from "./report-queue";

export default async function ConversationReportsPage() {
  const reports = await getConversationReports();
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Trust & safety</p>
      <h1 className="mt-2 font-display text-2xl font-semibold sm:text-3xl">Conversation reports</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Review participant reports and message history. Access is limited to support and administrator staff.
      </p>
      <ConversationReportQueue reports={reports} />
    </main>
  );
}
