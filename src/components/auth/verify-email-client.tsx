"use client";

import { useEffect, useState, useTransition } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthHeader } from "@/components/auth/AuthHeader";
import { AuthInput } from "@/components/auth/AuthInput";
import { PrimaryAuthButton } from "@/components/auth/PrimaryAuthButton";
import { AuthError } from "@/components/auth/AuthError";
import { AuthSuccess } from "@/components/auth/AuthSuccess";
import { AuthFooterLink } from "@/components/auth/AuthFooterLink";
import { validateEmail } from "@/validations/auth-validation";
import { verifyEmail, sendVerificationEmail } from "@/lib/auth-client";
import { Loader2 } from "lucide-react";

export default function VerifyEmailPageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"loading" | "success" | "error" | "idle">(
    token ? "loading" : "idle"
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Resend email state
  const [resendEmail, setResendEmail] = useState("");
  const [resendError, setResendError] = useState<string | undefined>();
  const [resendFormError, setResendFormError] = useState<string | null>(null);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!token) return;

    let isMounted = true;

    async function executeVerification() {
      try {
        const res = await verifyEmail({
          query: {
            token: token as string,
          },
        });

        if (!isMounted) return;

        if (res?.error) {
          setStatus("error");
          setErrorMessage(
            res.error.message || "Invalid or expired verification link."
          );
        } else {
          setStatus("success");
        }
      } catch {
        if (!isMounted) return;
        setStatus("error");
        setErrorMessage("An unexpected error occurred during email verification.");
      }
    }

    executeVerification();

    return () => {
      isMounted = false;
    };
  }, [token]);

  async function handleResendSubmit(e: React.FormEvent) {
    e.preventDefault();
    const emailErr = validateEmail(resendEmail);
    setResendError(emailErr);
    setResendFormError(null);

    if (emailErr) return;

    startTransition(async () => {
      try {
        const res = await sendVerificationEmail({
          email: resendEmail,
          callbackURL: "/dashboard",
        });

        if (res?.error) {
          setResendFormError(
            res.error.message || "Failed to send verification email. Please try again."
          );
        } else {
          setResendSuccess(true);
        }
      } catch {
        setResendFormError(
          "Unable to send verification email. Please try again."
        );
      }
    });
  }

  return (
    <AuthCard>
      {status === "loading" && (
        <div className="py-12 text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-gold" />
          <h2 className="mt-4 font-display text-xl text-foreground">
            Verifying your email...
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Please wait while we confirm your account access.
          </p>
        </div>
      )}

      {status === "success" && (
        <AuthSuccess
          title="Email Verified!"
          description="Your email address has been successfully verified. Welcome to GameTrade!"
        >
          <PrimaryAuthButton onClick={() => router.push("/dashboard")}>
            Go to Dashboard
          </PrimaryAuthButton>
        </AuthSuccess>
      )}

      {status === "error" && !resendSuccess && (
        <>
          <AuthHeader
            title="Verification Failed"
            subtitle="The email verification link is invalid or has expired."
          />

          <div className="space-y-6">
            <AuthError message={errorMessage} />

            <form onSubmit={handleResendSubmit} noValidate className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Enter your email address below to receive a new verification link:
              </p>
              <AuthError message={resendFormError} />
              <AuthInput
                label="Email Address"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
                error={resendError}
              />
              <PrimaryAuthButton loading={isPending} loadingText="Sending Link...">
                Resend Verification Link
              </PrimaryAuthButton>
            </form>

            <div className="mt-6 text-center">
              <AuthFooterLink linkText="Back to Sign In" to="/sign-in" />
            </div>
          </div>
        </>
      )}

      {status === "idle" && !resendSuccess && (
        <>
          <AuthHeader
            title="Verify Your Email"
            subtitle="Request a verification link for your GameTrade account."
          />

          <form onSubmit={handleResendSubmit} noValidate className="space-y-5">
            <AuthError message={resendFormError} />

            <AuthInput
              label="Email Address"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={resendEmail}
              onChange={(e) => setResendEmail(e.target.value)}
              error={resendError}
            />

            <PrimaryAuthButton loading={isPending} loadingText="Sending Email...">
              Send Verification Link
            </PrimaryAuthButton>
          </form>

          <div className="mt-6">
            <AuthFooterLink linkText="Back to Sign In" to="/sign-in" />
          </div>
        </>
      )}

      {resendSuccess && (
        <AuthSuccess
          title="Verification Sent"
          description={`We've sent a new verification link to ${resendEmail}. Please check your inbox and click the link to verify your account.`}
        >
          <AuthFooterLink linkText="Back to Sign In" to="/sign-in" />
        </AuthSuccess>
      )}
    </AuthCard>
  );
}
