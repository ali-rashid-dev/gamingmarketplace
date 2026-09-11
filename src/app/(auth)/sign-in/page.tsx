import type { Metadata } from "next";
import SignInPageClient from "@/components/auth/sign-in-client";

export const metadata: Metadata = {
  title: "Sign In — GameTrade",
  description: "Sign in to your GameTrade account to access your vault and start trading game assets.",
};

export default function SignInPage() {
  return <SignInPageClient />;
}
