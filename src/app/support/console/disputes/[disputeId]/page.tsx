import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSupportDispute } from "../../data";
import { DisputeActions } from "./dispute-actions";

type Props = { params: Promise<{ disputeId: string }> };

export default async function SupportDisputeDetailPage({ params }: Props) {
  const { disputeId } = await params;
  const dispute = await getSupportDispute(disputeId);
  if (!dispute) notFound();
  const active = ["OPEN", "UNDER_REVIEW"].includes(dispute.status);
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <Button render={<Link href="/support/console/disputes" />} nativeButton={false} variant="ghost" size="sm">← Disputes</Button>
      <div className="mt-4 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Dispute investigation</p>
          <h1 className="mt-2 break-words font-display text-2xl font-semibold sm:text-3xl">{dispute.reason}</h1>
          <p className="mt-2 text-sm text-muted-foreground">Order {dispute.order.orderNumber} · Opened {dispute.createdAt.toLocaleString()}</p>
        </div>
        <Badge variant={dispute.status === "OPEN" ? "destructive" : "secondary"}>{dispute.status.replaceAll("_", " ")}</Badge>
      </div>
      <div className="mt-6 grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,0.65fr)]">
        <div className="min-w-0 space-y-4">
          <Card>
            <CardHeader><CardTitle>Case description</CardTitle></CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap break-words text-sm leading-6">{dispute.description}</p>
              {dispute.resolution && <p className="mt-4 border-t border-border pt-4 text-sm">{dispute.resolution}</p>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Order and parties</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm">Order status: <span className="font-medium">{dispute.order.status.replaceAll("_", " ")}</span></p>
              <p className="break-words text-xs text-muted-foreground">Buyer: {dispute.order.buyer.name} · {dispute.order.buyer.email}</p>
              {dispute.order.items.map((item) => (
                <div key={item.id} className="rounded-lg border border-border p-3">
                  <p className="break-words text-sm font-medium">{item.listingTitle}</p>
                  <p className="mt-1 break-words text-xs text-muted-foreground">Seller: {item.seller.user.name} · {item.seller.user.email}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{item.currency} {item.totalPrice.toString()} · {item.status.toLowerCase()}</p>
                  {item.deliveries.map((delivery, index) => (
                    <p key={`${item.id}-${index}`} className="mt-1 text-xs text-muted-foreground">
                      Delivery {delivery.status.toLowerCase()}{delivery.deliveredAt ? ` · ${delivery.deliveredAt.toLocaleString()}` : ""}
                    </p>
                  ))}
                </div>
              ))}
            </CardContent>
          </Card>
          {dispute.evidence.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Submitted evidence</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {dispute.evidence.map((evidence) => (
                  <div key={evidence.id} className="min-w-0 rounded-lg border border-border p-3">
                    <p className="text-xs font-medium">{evidence.submittedBy.name} · {evidence.submittedBy.role}</p>
                    {evidence.description && <p className="mt-1 break-words text-sm">{evidence.description}</p>}
                    <a href={evidence.url} target="_blank" rel="noreferrer" className="mt-2 block break-all text-xs text-primary underline">Open evidence</a>
                    <time className="mt-2 block text-[10px] text-muted-foreground">{evidence.createdAt.toLocaleString()}</time>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
          {dispute.order.messages.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Order messages</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {dispute.order.messages.map((message) => (
                  <div key={message.id} className="rounded-lg border border-border p-3">
                    <p className="whitespace-pre-wrap break-words text-sm">{message.body}</p>
                    <time className="mt-2 block text-[10px] text-muted-foreground">{message.createdAt.toLocaleString()}</time>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
        <DisputeActions disputeId={dispute.id} active={active} status={dispute.status} />
      </div>
    </main>
  );
}
