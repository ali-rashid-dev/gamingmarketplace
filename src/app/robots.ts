import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin/",
        "/api/",
        "/checkout/",
        "/dashboard/",
        "/seller/",
        "/super-admin/",
        "/support/console/",
      ],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
