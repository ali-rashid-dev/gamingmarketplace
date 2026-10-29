import CatalogClient from "@/app/admin/catalog/catalog-client";
import { getCatalogGames } from "@/app/admin/catalog/catalog-data";

export default async function AdminCatalogPage() {
  const games = await getCatalogGames();
  return <CatalogClient initialGames={games} />;
}
