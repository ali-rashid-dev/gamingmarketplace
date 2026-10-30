import { requirePageSession } from "@/lib/authorization";
import { getBuyerWishlist } from "../buyer-data";
import { WishlistCard } from "./wishlist-card";

export default async function BuyerWishlistPage() {
  const { user } = await requirePageSession();
  const items = await getBuyerWishlist(user.id);
  const now = new Date();
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-patina">Saved offers</p>
      <h1 className="mt-2 font-display text-3xl font-semibold">Wishlist</h1>
      <p className="mt-2 text-sm text-muted-foreground">Keep an eye on listings you may want to buy.</p>
      {items.length ? (
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {items.map((item) => {
            const listing = item.listing;
            const available =
              listing.status === "ACTIVE" &&
              listing.publishedAt !== null &&
              listing.quantity > 0 &&
              (!listing.expiresAt || listing.expiresAt > now) &&
              listing.game.status === "PUBLISHED" &&
              listing.category.isActive &&
              listing.seller.status === "APPROVED" &&
              listing.seller.isAvailable;
            return <WishlistCard key={item.id} item={item} available={available} />;
          })}
        </div>
      ) : (
        <p className="mt-6 rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground sm:p-8">
          No saved offers yet. You can save listings from offer details.
        </p>
      )}
    </div>
  );
}
