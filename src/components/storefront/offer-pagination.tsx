import Link from "next/link";

export function OfferPagination({
  href,
  page,
  hasMore,
}: {
  href: string;
  page: number;
  hasMore: boolean;
}) {
  return (
    <nav aria-label="Offer pages" className="mt-8 flex items-center justify-between gap-4">
      {page > 1 ? (
        <Link
          href={`${href}${href.includes("?") ? "&" : "?"}page=${page - 1}`}
          className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/[0.05]"
        >
          Previous
        </Link>
      ) : <span />}
      <span className="text-xs text-slate-500">Page {page}</span>
      {hasMore ? (
        <Link
          href={`${href}${href.includes("?") ? "&" : "?"}page=${page + 1}`}
          className="rounded-xl border border-cyan-300/30 bg-cyan-300/[0.06] px-4 py-2.5 text-sm font-semibold text-cyan-100 hover:bg-cyan-300/[0.12]"
        >
          Next page
        </Link>
      ) : <span />}
    </nav>
  );
}
