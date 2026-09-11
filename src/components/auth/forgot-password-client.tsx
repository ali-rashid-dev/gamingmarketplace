"use client";

import { useState } from "react";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthHeader } from "@/components/auth/AuthHeader";
import { AuthInput } from "@/components/auth/AuthInput";
import { PrimaryAuthButton } from "@/components/auth/PrimaryAuthButton";
import { AuthError } from "@/components/auth/AuthError";
import { AuthSuccess } from "@/components/auth/AuthSuccess";
import { AuthFooterLink } from "@/components/auth/AuthFooterLink";
import { validateEmail } from "@/validations/auth-validation";
import { requestPasswordReset } from "@/lib/auth-client";

export default function ForgotPasswordClient() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next = validateEmail(email);
    setError(next);
    setFormError(null);
    if (next) return;

    setLoading(true);

    try {
      const res = await requestPasswordReset({
        email,
        redirectTo: "/reset-password",
      });

      if (res?.error) {
        setFormError(res.error.message || "Failed to send reset instructions. Please try again.");
        return;
      }

      setSent(true);
    } catch {
      setFormError("Failed to send reset instructions. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard>
      {sent ? (
        <AuthSuccess
          title="Check Your Email"
          description="We've sent instructions to your email address."
        >
          <AuthFooterLink linkText="Back to Sign In" to="/sign-in" />
        </AuthSuccess>
      ) : (
        <>
          <AuthHeader
            title="Recover Access"
            subtitle="Enter your email and we'll send you a secure link to reset your password."
          />

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <AuthError message={formError} />

            <AuthInput
              label="Email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={error}
            />

            <PrimaryAuthButton loading={loading} loadingText="Sending...">
              Send Reset Link
            </PrimaryAuthButton>
          </form>

          <div className="mt-7">
            <AuthFooterLink linkText="Back to Sign In" to="/sign-in" />
          </div>
        </>
      )}
    </AuthCard>
  );
}
