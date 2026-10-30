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

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
