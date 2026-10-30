import { notFound } from "next/navigation";
import { ListingForm } from "../listing-form";
import { getListingCatalog, getSellerListingForEdit } from "../listing-data";

export default async function EditSellerListingPage({
  params,
}: {
  params: Promise<{ listingId: string }>;
}) {
  const { listingId } = await params;
  if (!listingId || listingId.length > 128) notFound();
  const [games, listing] = await Promise.all([
    getListingCatalog(),
    getSellerListingForEdit(listingId),
  ]);
  return (
    <main className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
      <ListingForm games={games} listing={listing} />
    </main>
  );
}
