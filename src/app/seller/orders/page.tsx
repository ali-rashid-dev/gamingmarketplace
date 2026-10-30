import { getSellerOrders } from "../dashboard-data";
import { SellerOrders } from "./seller-orders";

export default async function SellerOrdersPage() {
  const orders = await getSellerOrders();
  return (
    <main className="mx-auto max-w-7xl px-5 py-9 sm:px-8">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">Seller operations</p>
      <h1 className="mt-2 font-display text-3xl font-semibold text-white">Orders</h1>
      <p className="mt-2 text-sm text-slate-400">Orders and fulfillment records for your shop only.</p>
      <SellerOrders orders={orders} />
    </main>
  );
}
