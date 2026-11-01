import type { Metadata } from "next";
import { Suspense } from "react";
import VerifyEmailPageClient from "@/components/auth/verify-email-client";
import { AuthCard } from "@/components/auth/AuthCard";
import { Loader2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Verify Email — GameTrade",
  description: "Verify your email address to activate your GameTrade account.",
  robots: { index: false, follow: false },
};

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <AuthCard>
          <div className="py-12 text-center">
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-gold" />
            <h2 className="mt-4 font-display text-xl text-foreground">
              Loading verification...
            </h2>
          </div>
        </AuthCard>
      }
    >
      <VerifyEmailPageClient />
    </Suspense>
  );
}
