import { SellerDisputeCase } from "@/app/disputes/dispute-workflow";
import { requireApprovedSeller } from "@/app/seller/listings/listing-data";
import prisma from "@/lib/prisma";

export default async function SellerDisputesPage() {
  const { sellerId, userId } = await requireApprovedSeller();
  const cases = await prisma.dispute.findMany({
    where: { orderItem: { sellerId } },
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    take: 100,
    select: {
      id: true,
      status: true,
      reasonCode: true,
      reason: true,
      description: true,
      decision: true,
      decisionAmount: true,
      resolution: true,
      resolvedAt: true,
      appealedAt: true,
      createdAt: true,
      messages: {
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        take: 200,
        select: {
          id: true,
          body: true,
          senderId: true,
          createdAt: true,
          sender: { select: { name: true } },
        },
      },
      evidence: {
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: {
          id: true,
          url: true,
          name: true,
          description: true,
          contentType: true,
          size: true,
          createdAt: true,
          submittedBy: { select: { name: true } },
        },
      },
      events: {
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        take: 200,
        select: {
          id: true,
          type: true,
          createdAt: true,
          actor: { select: { name: true } },
        },
      },
      order: { select: { orderNumber: true, buyer: { select: { name: true } } } },
      orderItem: { select: { listingTitle: true, currency: true, totalPrice: true } },
    },
  });

  return (
    <main className="mx-auto max-w-5xl px-5 py-9 sm:px-8">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">Buyer protection</p>
      <h1 className="mt-2 font-display text-3xl font-semibold text-white">Order cases</h1>
      <p className="mt-2 text-sm text-slate-400">Review buyer concerns, respond with relevant information, and submit evidence. Support makes case decisions.</p>
      {cases.length ? (
        <div className="mt-6 space-y-4">
          {cases.map((dispute) => (
            <section key={dispute.id} className="space-y-2 rounded-2xl border border-white/[0.09] bg-card p-4 sm:p-5">
              <p className="text-xs text-slate-400">
                Order {dispute.order.orderNumber} · {dispute.orderItem?.listingTitle ?? "Order"} · Buyer {dispute.order.buyer.name}
              </p>
              <SellerDisputeCase
                sellerId={userId}
                dispute={{
                  ...dispute,
                  decisionAmount: dispute.decisionAmount?.toString() ?? null,
                }}
              />
            </section>
          ))}
        </div>
      ) : (
        <p className="mt-6 rounded-2xl border border-dashed border-white/15 p-8 text-sm text-slate-400">There are no order cases for your shop.</p>
      )}
    </main>
  );
}
