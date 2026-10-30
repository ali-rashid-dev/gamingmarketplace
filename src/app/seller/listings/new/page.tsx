import { ListingForm } from "../listing-form";
import { getListingCatalog } from "../listing-data";

export default async function NewSellerListingPage() {
  const games = await getListingCatalog();
  return (
    <main className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
      <ListingForm games={games} />
    </main>
  );
}
