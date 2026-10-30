"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateSellerOrderItem } from "../dashboard-actions";

type Order = {
  id: string;
  orderNumber: string;
  orderStatus: string;
  buyerName: string;
  placedAt: Date;
  listingTitle: string;
  totalPrice: string;
  currency: string;
  quantity: number;
  status: string;
  delivery: { id: string; status: string; deliveredAt: Date | null } | null;
  dispute: { id: string; status: string; reason: string } | null;
  deliveryType: string | null;
  deliveryEstimate: string | null;
};

function OrderRow({ order }: { order: Order }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, startTransition] = useTransition();
  function update(action: "process" | "mark-delivered") {
    setError("");
    startTransition(async () => {
      try {
        const result = await updateSellerOrderItem(order.id, action);
        if (!result.success) throw new Error(result.error);
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Unable to update order");
      }
    });
  }
  return (
    <article className="rounded-2xl border border-white/[0.09] bg-[#111a2b] p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs text-cyan-300">Order {order.orderNumber} · {new Date(order.placedAt).toLocaleString()}</p>
          <h2 className="mt-1 font-semibold text-white">{order.listingTitle}</h2>
          <p className="mt-1 text-xs text-slate-400">Buyer: {order.buyerName} · Qty {order.quantity} · {order.orderStatus.toLowerCase()}</p>
        </div>
        <div className="text-right">
          <p className="font-semibold text-white">{order.currency} {order.totalPrice}</p>
          <p className="mt-1 text-xs text-slate-400">Fulfillment: {order.status.toLowerCase()}</p>
        </div>
      </div>
      {order.deliveryType && (
        <p className="mt-3 text-xs text-slate-500">
          {order.deliveryType.toLowerCase()} delivery{order.deliveryEstimate ? ` · ${order.deliveryEstimate}` : ""}
        </p>
      )}
      {order.delivery?.deliveredAt && <p className="mt-2 text-xs text-emerald-200">Marked delivered {new Date(order.delivery.deliveredAt).toLocaleString()}</p>}
      {order.dispute && (
        <p className="mt-3 rounded-lg border border-rose-300/20 bg-rose-300/[0.05] p-3 text-xs text-rose-200">
          Dispute {order.dispute.status.toLowerCase()}: {order.dispute.reason}
        </p>
      )}
      {order.orderStatus === "PAID" || order.orderStatus === "PROCESSING" ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {order.status === "PENDING" && (
            <button disabled={busy || Boolean(order.dispute)} onClick={() => update("process")} className="rounded-lg bg-cyan-300 px-4 py-2 text-xs font-bold text-slate-950 disabled:opacity-50">Start processing</button>
          )}
          {order.status === "PROCESSING" && (
            <button disabled={busy || Boolean(order.dispute)} onClick={() => update("mark-delivered")} className="rounded-lg bg-emerald-300 px-4 py-2 text-xs font-bold text-slate-950 disabled:opacity-50">Mark delivered</button>
          )}
          {order.dispute && <span className="self-center text-xs text-slate-500">Fulfillment controls are paused while disputed.</span>}
        </div>
      ) : null}
      {error && <p role="alert" className="mt-3 text-xs text-rose-300">{error}</p>}
    </article>
  );
}

export function SellerOrders({ orders }: { orders: Order[] }) {
  if (!orders.length) {
    return <p className="mt-7 rounded-2xl border border-dashed border-white/15 p-8 text-sm text-slate-400">Your orders will appear here after customers purchase your offers.</p>;
  }
  return <div className="mt-7 space-y-4">{orders.map((order) => <OrderRow key={order.id} order={order} />)}</div>;
}
