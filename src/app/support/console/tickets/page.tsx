import { getSupportAgents, getSupportTickets } from "../data";
import { TicketQueue } from "./ticket-queue";

type Props = {
  searchParams: Promise<{ page?: string; status?: string; assignment?: string }>;
};

export default async function SupportTicketsPage({ searchParams }: Props) {
  const params = await searchParams;
  const parsedPage = params.page && /^\d+$/.test(params.page) ? Number(params.page) : 1;
  const status = params.status ?? "ALL";
  const assignment = params.assignment ?? "ALL";
  const [{ tickets, totalCount, page, pageCount }, agents] = await Promise.all([
    getSupportTickets({ page: parsedPage, status, assignment }),
    getSupportAgents(),
  ]);
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Case management</p>
      <h1 className="mt-2 font-display text-2xl font-semibold sm:text-3xl">Ticket queue</h1>
      <p className="mt-2 text-sm text-muted-foreground">Assign an owner, set urgency, and keep each customer updated.</p>
      <TicketQueue
        tickets={tickets}
        agents={agents}
        totalCount={totalCount}
        page={page}
        pageCount={pageCount}
        status={status}
        assignment={assignment}
      />
    </main>
  );
}
