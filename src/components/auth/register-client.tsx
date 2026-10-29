"use client";

import { useState } from "react";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthHeader } from "@/components/auth/AuthHeader";
import { AuthInput } from "@/components/auth/AuthInput";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { PrimaryAuthButton } from "@/components/auth/PrimaryAuthButton";
import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton";
import { AuthDivider } from "@/components/auth/AuthDivider";
import { AuthError } from "@/components/auth/AuthError";
import { AuthSuccess } from "@/components/auth/AuthSuccess";
import { AuthFooterLink } from "@/components/auth/AuthFooterLink";
import { PasswordRequirements } from "@/components/auth/PasswordRequirements";
import { validateEmail, validatePassword, validateRequired } from "@/validations/auth-validation";
import { signIn, signUp } from "@/lib/auth-client";

export default function RegisterPageClient() {
  const [values, setValues] = useState({ name: "", email: "", password: "" });
  const [errors, setErrors] = useState<{
    name?: string | undefined;
    email?: string | undefined;
    password?: string | undefined;
  }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [created, setCreated] = useState(false);

  function set(key: keyof typeof values) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setValues((v) => ({ ...v, [key]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next = {
      name: validateRequired(values.name, "Name"),
      email: validateEmail(values.email),
      password: validatePassword(values.password),
    };
    setErrors(next);
    setFormError(null);
    if (next.name || next.email || next.password) return;

    setLoading(true);

    try {
      const res = await signUp.email({
        name: values.name,
        email: values.email,
        password: values.password,
      });

      if (res?.error) {
        setFormError(res.error.message || "Failed to create account. Please try again.");
        setLoading(false);
      } else {
        setLoading(false);
        setCreated(true);
      }
    } catch {
      setFormError("Failed to create account. Please try again.");
      setLoading(false);
    }
  }

  return (
    <AuthCard>
      {created ? (
        <AuthSuccess
          title="Check Your Email"
          description={`We've sent a verification link to ${values.email}. Please check your inbox and verify your email address to activate your vault access.`}
        >
          <div className="space-y-3">
            <AuthFooterLink text="Didn't get an email?" linkText="Resend verification link" to={`/verify-email`} />
            <AuthFooterLink linkText="Back to Sign In" to="/sign-in" />
          </div>
        </AuthSuccess>
      ) : (
        <>
          <AuthHeader
            title="Create Your Account"
            subtitle="Create your GameTrade account and enter the vault."
          />

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <AuthError message={formError} />

            <AuthInput
              label="Name"
              name="name"
              autoComplete="name"
              placeholder="Your name"
              value={values.name}
              onChange={set("name")}
              error={errors.name}
            />

            <AuthInput
              label="Email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={values.email}
              onChange={set("email")}
              error={errors.email}
            />

            <div className="space-y-3">
              <PasswordInput
                label="Password"
                name="password"
                autoComplete="new-password"
                placeholder="••••••••"
                value={values.password}
                onChange={set("password")}
                error={errors.password}
              />
              <PasswordRequirements value={values.password} />
            </div>

            <PrimaryAuthButton loading={loading} loadingText="Creating account...">
              Create Account
            </PrimaryAuthButton>
          </form>

          <div className="my-6">
            <AuthDivider />
          </div>

          <GoogleAuthButton
            loading={googleLoading}
            onClick={async () => {
              setGoogleLoading(true);
              setFormError(null);

              try {
                const res = await signIn.social({
                  provider: "google",
                  callbackURL: "/dashboard",
                });

                if (res?.error) {
                  setFormError(res.error.message || "Unable to continue with Google. Please try again.");
                }
              } catch {
                setFormError("Unable to continue with Google. Please try again.");
              } finally {
                setGoogleLoading(false);
              }
            }}
          />

          <div className="mt-7">
            <AuthFooterLink text="Already have an account?" linkText="Sign in" to="/sign-in" />
          </div>
        </>
      )}
    </AuthCard>
  );
}
