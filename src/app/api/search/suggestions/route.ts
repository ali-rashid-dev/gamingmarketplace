import { getOfferSearchSuggestions } from "@/lib/storefront-search";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q") ?? "";
  const suggestions = await getOfferSearchSuggestions(query);
  return NextResponse.json(
    { suggestions },
    { headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=60" } }
  );
}
