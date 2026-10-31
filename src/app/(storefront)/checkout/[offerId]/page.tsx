import Link from "next/link";
import { ArrowLeft, LockKeyhole } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requirePageSession } from "@/lib/authorization";
import { getOfferById, formatPrice } from "@/lib/storefront";
import prisma from "@/lib/prisma";

type Props = { params: Promise<{ offerId: string }> };

export default async function CheckoutPage({ params }: Props) {
  const [{ user }, { offerId }] = await Promise.all([
    requirePageSession(),
    params,
  ]);
  const offer = await getOfferById(offerId);
  const seller = await prisma.sellerProfile.findUnique({
    where: { id: offer.sellerId },
    select: { userId: true },
  });
  const isOwnOffer = seller?.userId === user.id;
  const total = offer.price;

  return (
    <main className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
      <Link
        href={`/offers/${offer.id}`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Back to offer
      </Link>

      <div className="mt-7">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          Checkout
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold">
          Review your purchase
        </h1>
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.7fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Offer details</CardTitle>
            <CardDescription>
              Check the seller and item before continuing.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="font-semibold">{offer.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {offer.game.name} · {offer.category.name}
              </p>
            </div>
            <dl className="grid gap-3 border-t border-border pt-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Seller</dt>
                <dd className="mt-1 font-medium">{offer.seller.shopName}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Quantity</dt>
                <dd className="mt-1 font-medium">1</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Platform</dt>
                <dd className="mt-1 font-medium">{offer.platform || "Not specified"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Region</dt>
                <dd className="mt-1 font-medium">{offer.region || "Not specified"}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Order summary</CardTitle>
            <CardDescription>
              This is a review only. No order has been placed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">Item price</dt>
                <dd>{formatPrice(offer.price, offer.currency)}</dd>
              </div>
              <div className="flex justify-between gap-3 border-t border-border pt-3 font-semibold">
                <dt>Displayed total</dt>
                <dd>{formatPrice(total, offer.currency)}</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              Taxes, discounts, and any checkout fees are not configured. A
              final total cannot be confirmed yet.
            </p>
            <div className="mt-5 rounded-lg border border-border p-3">
              <p className="text-sm font-medium">Payment method</p>
              <p className="mt-1 text-xs text-muted-foreground">
                No payment methods are available yet.
              </p>
            </div>
            <Alert className="mt-5">
              <LockKeyhole aria-hidden="true" />
              <AlertTitle>
                {isOwnOffer ? "This is your offer" : "Payments are not set up yet"}
              </AlertTitle>
              <AlertDescription>
                {isOwnOffer
                  ? "You cannot purchase your own offer."
                  : "No payment provider is configured. You will not be charged, and no order or inventory reservation will be created."}
              </AlertDescription>
            </Alert>
            <Button type="button" disabled className="mt-5 w-full">
              {isOwnOffer ? "Unavailable for your own offer" : "Continue to payment"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
