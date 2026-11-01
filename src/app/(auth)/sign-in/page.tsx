import type { Metadata } from "next";
import SignInPageClient from "@/components/auth/sign-in-client";

export const metadata: Metadata = {
  title: "Sign In — GameTrade",
  description: "Sign in to your GameTrade account to access your vault and start trading game assets.",
  robots: { index: false, follow: false },
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const query = await searchParams;
  const nextPath = query.next === "/sell/apply" ? query.next : "/dashboard";
  return <SignInPageClient nextPath={nextPath} />;
}
