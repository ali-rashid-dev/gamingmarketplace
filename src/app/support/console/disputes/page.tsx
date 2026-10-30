import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getSupportDisputes } from "../data";

type Props = { searchParams: Promise<{ status?: string }> };

export default async function SupportDisputesPage({ searchParams }: Props) {
  const { status } = await searchParams;
  const disputes = await getSupportDisputes(status);
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Case investigation</p>
      <h1 className="mt-2 font-display text-2xl font-semibold sm:text-3xl">Buyer–seller disputes</h1>
      <p className="mt-2 text-sm text-muted-foreground">Review evidence, request information, and escalate cases for resolution.</p>
      <form className="mt-5 flex flex-col gap-3 sm:flex-row">
        <select name="status" defaultValue={status ?? "ACTIVE"} className="min-h-10 rounded-lg border border-input bg-background px-3 text-sm text-foreground">
          <option value="ACTIVE">Open and under review</option>
          {["OPEN", "UNDER_REVIEW", "RESOLVED", "BUYER_FAVOR", "SELLER_FAVOR", "CLOSED"].map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}
        </select>
        <button className="min-h-10 rounded-lg border border-border px-4 text-sm font-medium hover:bg-muted">Filter disputes</button>
      </form>
      {disputes.length ? (
        <div className="mt-5 space-y-3">
          {disputes.map((dispute) => (
            <Card key={dispute.id} className="min-w-0">
              <CardContent className="flex min-w-0 flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                <Link href={`/support/console/disputes/${dispute.id}`} className="min-w-0 hover:underline">
                  <span className="block break-words font-semibold">{dispute.reason}</span>
                  <span className="mt-1 block break-words text-xs text-muted-foreground">
                    Order {dispute.order.orderNumber} · {dispute.order.buyer.name}
                    {dispute.orderItem ? ` · ${dispute.orderItem.listingTitle}` : ""}
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">Opened {dispute.createdAt.toLocaleString()}</span>
                </Link>
                <Badge variant={dispute.status === "OPEN" ? "destructive" : "secondary"}>{dispute.status.replaceAll("_", " ")}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="mt-5 border-dashed"><CardContent className="py-10 text-center text-sm text-muted-foreground">No disputes match this filter.</CardContent></Card>
      )}
    </main>
  );
}
