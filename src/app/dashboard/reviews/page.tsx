import { requirePageSession } from "@/lib/authorization";
import Link from "next/link";
import { getBuyerReviews } from "../buyer-data";
import { ReviewForm } from "./review-form";

export default async function BuyerReviewsPage() {
  const { user } = await requirePageSession();
  const { reviews, eligibleItems } = await getBuyerReviews(user.id);
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-patina">Feedback</p>
      <h1 className="mt-2 font-display text-3xl font-semibold">Reviews</h1>
      <p className="mt-2 text-sm text-muted-foreground">Review eligible purchases and see feedback you have submitted.</p>
      <div className="mt-6 grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-4">
          {eligibleItems.length ? (
            <ReviewForm eligibleItems={eligibleItems} />
          ) : (
            <p className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
              No completed purchases are waiting for a review.
            </p>
          )}
        </div>
        <section>
          <h2 className="font-display text-xl font-semibold">Your reviews</h2>
          {reviews.length ? (
            <div className="mt-4 space-y-3">
              {reviews.map((review) => (
                <article key={review.id} className="rounded-xl border border-border bg-card p-5">
                  <div className="flex justify-between gap-3">
                    <p className="font-semibold">{review.rating} / 5 · {review.listing?.title ?? review.orderItem.listingTitle}</p>
                    <time className="shrink-0 text-xs text-muted-foreground">{review.createdAt.toLocaleDateString()}</time>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">Order {review.orderItem.order.orderNumber}</p>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{review.comment || "No written feedback."}</p>
                  <Link href={`/dashboard/support?orderId=${review.orderItem.order.id}`} className="mt-3 inline-flex text-xs font-semibold text-gold hover:underline">
                    Report seller behavior
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-4 rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">Your submitted reviews will appear here.</p>
          )}
        </section>
      </div>
    </div>
  );
}
