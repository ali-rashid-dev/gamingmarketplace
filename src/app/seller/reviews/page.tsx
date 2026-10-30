import { getSellerReviews } from "../dashboard-data";

export default async function SellerReviewsPage() {
  const { average, count, reviews } = await getSellerReviews();
  return (
    <main className="mx-auto max-w-5xl px-5 py-9 sm:px-8">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">Customer feedback</p>
      <h1 className="mt-2 font-display text-3xl font-semibold text-white">Reviews</h1>
      <p className="mt-2 text-sm text-slate-400">
        {average?.toFixed(1) ?? "No rating yet"} average · {count} review{count === 1 ? "" : "s"}
      </p>
      {reviews.length ? (
        <div className="mt-7 space-y-3">
          {reviews.map((review) => (
            <article key={review.id} className="rounded-2xl border border-white/[0.09] bg-card p-5">
              <div className="flex flex-wrap justify-between gap-3">
                <p className="font-semibold text-white">{review.rating}/5 · {review.buyer.name}</p>
                <time className="text-xs text-slate-500">{review.createdAt.toLocaleDateString()}</time>
              </div>
              {review.listing && <p className="mt-2 text-xs text-cyan-200">{review.listing.title}</p>}
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-300">{review.comment || "No written feedback."}</p>
            </article>
          ))}
        </div>
      ) : (
        <p className="mt-7 rounded-2xl border border-dashed border-white/15 p-8 text-sm text-slate-400">Verified order reviews will appear here.</p>
      )}
    </main>
  );
}
