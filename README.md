This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Admin game catalog

Administrators can manage games and their product categories at `/admin/catalog`.
Category types, supported platforms, and listing-field definitions are configured
in the admin interface through authenticated Server Actions. Apply the catalog database migration with
`pnpm exec prisma migrate dev` before using this feature.

Game logo and cover uploads use UploadThing. Set `UPLOADTHING_TOKEN` in the
server environment to enable uploads; image URLs can also be entered directly.

Application data mutations use authenticated Server Actions. The `/api/auth`
route remains for Better Auth's required authentication protocol endpoints.

## Roles and permissions

Roles are assigned through `UserRoleAssignment`; permissions are granted through
`RolePermission`. A database trigger assigns the Buyer role to every newly
created user. Seller access is added only when an administrator approves the
seller application, and server-side authorization also checks that the seller
profile remains approved. Support and administrator roles are assigned through
the super-admin workflow. Users cannot assign themselves roles.

The initial role-permission policy is seeded by the
`20261031200000_multi_role_rbac` migration. Role and permission assignments are
queried server-side rather than taken from session role claims. Apply the
migration before deploying the updated application:

```bash
pnpm exec prisma migrate deploy
```

The super-admin roles page displays the persisted role-permission matrix.
Permission grants are currently fixed by the migration; a configurable
permission-management UI and mandatory multi-factor authentication are not
implemented.

## Public storefront

The public storefront is server-rendered and available without an account:
`/` is the homepage, `/games` lists published games, `/games/[gameSlug]` shows a
game landing page, and `/games/[gameSlug]/[categorySlug]` lists offers.
Individual offers are at `/offers/[offerId]`; approved seller shops are at
`/shops/[shopSlug]`. Help, policy, contact, and seller information are available
at `/help`, `/policies`, `/contact`, and `/sell`.

Only active listings attached to published games, visible categories, and
approved sellers are shown publicly. Offers with an expiration date are hidden
once that date passes.

## Checkout and payments

Signed-in buyers can review an offer at `/checkout/[offerId]`. Checkout is
intentionally read-only until a marketplace-capable payment provider is
configured: it does not create an order or payment record, reserve inventory,
or mark an order as paid. No payment success URL should be treated as proof of
payment.

Before enabling order creation, integrate a provider that supports the
marketplace's seller countries, seller onboarding, delayed transfers, and
refunds. The server-side integration must use idempotent payment intents,
verify signed webhooks before changing order/payment state, reconcile delayed
and duplicate events, and keep authorization, capture, seller balances, and
payouts as separate audited operations. Configure currency precision, fees,
taxes, and discounts before showing a final payable total. Do not deploy a
success-shaped mock payment flow.

## Offer search

The `/offers` page searches listing titles and descriptions with PostgreSQL
full-text search, and includes game and category names in matching. Search,
catalog, price, platform, region, minimum seller rating, verification,
instant-delivery, availability, and sort filters are URL-backed and combine
with one another. Category pages accept the same filters while keeping their
game and category selection pinned. Results are paginated and exclude
unpublished, expired, sold-out, and otherwise unavailable listings.
Price bounds and price sorting require an explicit currency and compare only
listings in that currency; prices are not converted.

The full-text index and generated listing search vector are created by the
`20261030230000_storefront_full_text_search` migration.

## Seller listings

Approved sellers manage drafts and offers at `/seller/listings`. The listing
editor uses the published game catalog, configured category fields and
platforms, validated image uploads, delivery details, and optional expiration.
Submitting a listing sends it to `/admin/listings` for moderation; only approved
offers become visible on the storefront. Editing listing details requires a new
review, while price and quantity updates are available from the seller listing
dashboard. A quantity of zero marks an offer sold out.

Listing revisions are retained for seller edits, availability changes,
moderation, and removal. Removed listings are hidden from seller and buyer
views while their order and revision history remains available to the system.
Account passwords, recovery codes, and other account credentials are not
accepted in listing descriptions or category attributes. Secure credential
handover is not currently supported.

Apply the seller listing database migration with
`pnpm exec prisma migrate dev` before using seller listings or moderation.

## Seller dashboard

Approved sellers use `/seller` for shop metrics and recent sales, with sections
for listings, orders, messages, reviews, earnings, shop profile, verification,
and settings. Seller queries and mutations are scoped to the authenticated
seller; sellers cannot access another shop's listings, orders, or conversations.
Bulk listing actions support pausing, reactivating, and stock updates. Sellers
can mark eligible orders as processing or delivered; disputed orders are held
from fulfillment actions.

The seller availability setting hides that seller's offers and shop from the
public storefront without changing listing status. Conversion tracking is not
available until reliable listing-view data exists. Verification is displayed
from the existing seller approval state; no document upload or KYC workflow is
implemented. Earnings and payout history are read-only because payout setup
and withdrawal requests are not implemented. Secure credential handover is
also unsupported; sellers should not send passwords or recovery codes in
listing descriptions or messages.

Apply the `20261030233000_seller_availability` migration along with the seller
listing and search migrations before enabling the seller dashboard.

## Demo marketplace data

Run `pnpm exec prisma db seed` to idempotently create the demo seller, games,
categories, and clearly labeled, non-redeemable sample listings. The seed uses
reserved `.invalid` email addresses and fixed `seed-` record identifiers. It
does not create buyer orders, payments, or real credentials.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
