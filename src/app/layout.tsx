import type { Metadata } from "next";
import { Inter, Zilla_Slab } from "next/font/google";
import { JsonLd } from "@/components/seo/json-ld";
import { absoluteUrl, siteUrl } from "@/lib/site-url";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const zillaSlab = Zilla_Slab({
  variable: "--font-zilla-slab",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: siteUrl,
  applicationName: "GameTrade",
  title: "GameTrade — Game Marketplace",
  description:
    "Discover game accounts, items, top-ups, and services from sellers on GameTrade.",
  openGraph: {
    type: "website",
    siteName: "GameTrade",
    title: "GameTrade — Game Marketplace",
    description:
      "Discover game accounts, items, top-ups, and services from sellers on GameTrade.",
    images: ["/opengraph-image"],
  },
  twitter: {
    card: "summary",
    title: "GameTrade — Game Marketplace",
    description:
      "Discover game accounts, items, top-ups, and services from sellers on GameTrade.",
    images: ["/twitter-image"],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`dark ${inter.variable} ${zillaSlab.variable} h-full antialiased`}
    >
      <body
        suppressHydrationWarning
        className="min-h-full flex flex-col bg-background text-foreground font-sans"
      >
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "GameTrade",
            url: absoluteUrl("/"),
          }}
        />
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: "GameTrade",
            url: absoluteUrl("/"),
            potentialAction: {
              "@type": "SearchAction",
              target: `${absoluteUrl("/games")}?q={search_term_string}`,
              "query-input": "required name=search_term_string",
            },
          }}
        />
        {children}
      </body>
    </html>
  );
}
