import type { Metadata } from "next";
import { Inter, Zilla_Slab } from "next/font/google";
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
  title: "GameTrade — Game Marketplace",
  description:
    "Discover game accounts, items, top-ups, and services from sellers on GameTrade.",
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
        {children}
      </body>
    </html>
  );
}
