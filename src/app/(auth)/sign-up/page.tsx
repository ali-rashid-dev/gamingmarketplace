import type { Metadata } from "next";
import RegisterPageClient from "@/components/auth/register-client";

export const metadata: Metadata = {
  title: "Create Account — GameTrade",
  description:
    "Create your GameTrade account to enter the vault and start trading game assets securely.",
};

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const query = await searchParams;
  const nextPath = query.next === "/sell/apply" ? query.next : "/dashboard";
  return <RegisterPageClient nextPath={nextPath} />;
}
