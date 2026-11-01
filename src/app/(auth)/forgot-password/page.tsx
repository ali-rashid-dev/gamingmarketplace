import type { Metadata } from "next";
import ForgotPasswordClient from "@/components/auth/forgot-password-client";

export const metadata: Metadata = {
  title: "Recover Access — GameTrade",
  description:
    "Recover access to your GameTrade vault. We'll send a secure link to reset your password.",
  robots: { index: false, follow: false },
  openGraph: {
    title: "Recover Access — GameTrade",
    description: "We'll send you a secure link to reset your GameTrade password.",
  },
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordClient />;
}
