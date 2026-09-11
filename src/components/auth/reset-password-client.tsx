"use client";

import { useState } from "react";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthHeader } from "@/components/auth/AuthHeader";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { PrimaryAuthButton } from "@/components/auth/PrimaryAuthButton";
import { AuthError } from "@/components/auth/AuthError";
import { AuthSuccess } from "@/components/auth/AuthSuccess";
import { AuthFooterLink } from "@/components/auth/AuthFooterLink";
import { PasswordRequirements } from "@/components/auth/PasswordRequirements";
import { MISMATCH_MESSAGE, REQUIRED_MESSAGE, validatePassword } from "@/validations/auth-validation";

export default function ResetPasswordClient() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<{ password?: string | undefined; confirm?: string | undefined }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next: { password?: string | undefined; confirm?: string | undefined } = {
      password: validatePassword(password),
    };
    if (!confirm) next.confirm = REQUIRED_MESSAGE;
    else if (confirm !== password) next.confirm = MISMATCH_MESSAGE;

    setErrors(next);
    setFormError(null);
    if (next.password || next.confirm) return;

    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setDone(true);
    }, 1300);
  }

  return (
    <AuthCard>
      {done ? (
        <AuthSuccess
          title="Password Updated"
          description="Your vault is secured with your new password. You can now sign in."
        >
          <AuthFooterLink linkText="Back to Sign In" to="/sign-in" />
        </AuthSuccess>
      ) : (
        <>
          <AuthHeader
            title="Reset Your Password"
            subtitle="Choose a new password to secure your vault access."
          />

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <AuthError message={formError} />

            <div className="space-y-3">
              <PasswordInput
                label="New Password"
                name="new-password"
                autoComplete="new-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={errors.password}
              />
              <PasswordRequirements value={password} />
            </div>

            <PasswordInput
              label="Confirm Password"
              name="confirm-password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              error={errors.confirm}
            />

            <PrimaryAuthButton loading={loading} loadingText="Resetting...">
              Reset Password
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
