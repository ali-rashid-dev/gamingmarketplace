import type { Metadata } from "next";
import ResetPasswordClient from "@/components/auth/reset-password-client";

export const metadata: Metadata = {
  title: "Reset Your Password — GameTrade",
  description:
    "Set a new password for your GameTrade account and restore secure vault access.",
  robots: { index: false, follow: false },
  openGraph: {
    title: "Reset Your Password — GameTrade",
    description: "Set a new password and restore secure access to your GameTrade vault.",
  },
};

export default function ResetPasswordPage() {
  return <ResetPasswordClient />;
}
