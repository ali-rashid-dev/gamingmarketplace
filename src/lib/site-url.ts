const configuredSiteUrl = process.env.BETTER_AUTH_URL?.trim();
const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();

export const siteUrl = new URL(
  configuredSiteUrl ||
    (productionHost ? `https://${productionHost}` : "http://localhost:3000")
);

export function absoluteUrl(path: string) {
  return new URL(path, siteUrl).toString();
}
