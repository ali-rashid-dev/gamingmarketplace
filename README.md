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

## Deployment environment

Set `DATABASE_URL` to a PostgreSQL database reachable from the application at
runtime, and apply committed migrations with `pnpm exec prisma migrate deploy`.
Set `BETTER_AUTH_SECRET` to the same unique, high-entropy secret across all
application instances; for example, generate one with `openssl rand -base64 32`.
Also set `BETTER_AUTH_URL` to the deployed application's canonical origin.
Do not use the development secret or localhost URL in production.

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

## Orders and digital delivery

The buyer dashboard provides order history and detail pages; approved sellers
have an order queue to start fulfillment and record delivery instructions.
Buyer receipt confirmation completes an item, and completes the order only
when all its items are completed, cancelled, or refunded. Seller fulfillment
and buyer confirmation are checked server-side and written to `AuditLog` in
the same database transaction as their state changes. Buyers can print a
receipt from eligible orders; it is not a tax invoice.

Automatic order creation, failed-payment recovery, cancellation/refund
processing, instant digital delivery, admin order overrides, and
delivery-deadline alerts are not enabled. Orders remain gated on payment
provider verification; account passwords and recovery codes must not be put
in delivery instructions. Configure a delivery SLA before adding due dates or
overdue alerts rather than deriving deadlines from free-form delivery estimates.

## Seller ledger, commissions, and payouts

The seller finance view separates settled ledger funds from gross pending order
value. Pending, unpaid, unsettled, or actively disputed items are not withdrawable.
Commission rates are versioned and must be explicitly configured by an
administrator at `/admin/finance`; there is no assumed marketplace rate.
Each posted completed sale records an immutable commission snapshot and an
idempotent seller-ledger credit. The posting operation requires a successful
payment with a settlement timestamp and provider settlement reference, a
completed item, sufficient settled payment for the order, and no active dispute
or recorded full/partial refund decision.

Ledger entries, commission snapshots, commission rules, and payout-status events
are append-only at the database layer. A withdrawal request atomically reserves
available ledger funds; rejection or failure records a separate release credit.
Only finance-authorized administrators can change payout status, and recording a
paid payout requires an external provider reference. These controls record and
reconcile financial events; they do not initiate transfers, refunds, or
chargebacks.

No marketplace-capable payment or payout gateway is configured yet. Therefore
the app currently cannot create trusted settlement records, post seller
earnings, execute refunds, or send payouts. A future gateway integration must
verify signed provider events, own the trusted settlement fields, handle
idempotency and reversals, and reconcile provider balances before enabling live
fund movement. Finance pages must not be interpreted as a statement that funds
are held by GameTrade or available from a payment provider.
Apply `20261101050000_seller_finance_ledger` with the reviewed
`prisma migrate deploy` process before deploying these schema changes.

## Buyer protection and disputes

GameTrade's buyer-protection policy allows one active case per eligible order
item. Buyers may open non-delivery cases within 30 days of order placement and
delivery-quality cases within 7 days of the recorded delivery timestamp.
Structured reasons cover non-delivery, invalid goods, goods not as described,
and other issues. Buyers, the relevant seller, and authorized support staff can
respond and submit JPEG, PNG, WebP, or PDF evidence up to 8 MB when
`UPLOADTHING_TOKEN` is configured. A buyer may appeal a recorded decision once
within 7 days.

Support can assign cases to support agents and record a reasoned decision.
Decisions and participant responses are retained in case history and the audit
log. Refund, partial-refund, and release-to-seller decisions are records only:
the application has no configured payment provider/refund operation, so this
workflow never changes payment, seller balance, withdrawal, or held-fund state.
Only a future, separately authorized payment integration may carry out such
financial operations. This is GameTrade's own case policy, not a claim of
third-party buyer-protection coverage. Do not upload credentials or unrelated
sensitive data as evidence.

## Reviews and reputation

Buyers can submit a 1–5 star rating and written feedback only for their own
completed order items, with one review per item enforced by a unique database
constraint. Ratings and review counts are calculated server-side from published
reviews attached to completed orders.
Seller storefronts display verified-purchase reviews and allow buyers to
report a review; administrators can resolve reports, hide reviews, or restore
them, with moderation actions recorded in the audit log. Sellers can post or
update a public response to a published review.

The `20261101010000_review_reputation` migration adds review visibility,
seller responses, and unique per-buyer reports. Apply it through the reviewed
database migration deployment process before deploying these changes.

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

## Buyer–seller messaging

Buyers and approved sellers can exchange messages in participant-scoped
conversations, including order-specific threads opened from buyer order details.
Threads refresh by polling, track unread and read messages, and create in-app
notifications for recipients. JPEG, PNG, WebP, and PDF attachments up to 5 MB
each are stored with UploadThing; set `UPLOADTHING_TOKEN` to enable uploads.
Each sender is limited to 10 messages per minute. Participants can report a
conversation; support, admins, and super-admins review reports in
`/support/console/conversation-reports`. Support staff can inspect order
messages only through authorized dispute cases. Apply the
`20261101030000_module_10_messaging` migration before deploying messaging
changes.

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
