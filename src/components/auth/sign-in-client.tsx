"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthHeader } from "@/components/auth/AuthHeader";
import { AuthInput } from "@/components/auth/AuthInput";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { PrimaryAuthButton } from "@/components/auth/PrimaryAuthButton";
import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton";
import { AuthDivider } from "@/components/auth/AuthDivider";
import { AuthError } from "@/components/auth/AuthError";
import { AuthFooterLink } from "@/components/auth/AuthFooterLink";
import { validateEmail, validateRequired } from "@/validations/auth-validation";
import { signIn } from "@/lib/auth-client";

export default function SignInPageClient({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [values, setValues] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  function set(key: keyof typeof values) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setValues((v) => ({ ...v, [key]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const next = {
      email: validateEmail(values.email),
      password: validateRequired(values.password, "Password"),
    };
    setErrors(next);
    setFormError(null);
    if (next.email || next.password) return;

    setLoading(true);

    try {
      const res = await signIn.email({
        email: values.email,
        password: values.password,
      });

      if (res?.error) {
        setFormError(res.error.message || "Invalid credentials. Please try again.");
        setLoading(false);
      } else {
        router.push(nextPath);
      }
    } catch {
      setLoading(false);
      setFormError("Unable to sign in. Please try again.");
    }
  }

  return (
    <AuthCard>
      <AuthHeader
        title="Welcome Back"
        subtitle="Sign in to your GameTrade account to access your vault."
      />

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <AuthError message={formError} />

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

        <PasswordInput
          label="Password"
          labelAside={
            <Link
              href="/forgot-password"
              className="text-xs font-medium text-gold hover:underline underline-offset-4 rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold"
            >
              Forgot password?
            </Link>
          }
          name="password"
          autoComplete="current-password"
          placeholder="••••••••"
          value={values.password}
          onChange={set("password")}
          error={errors.password}
        />

        <PrimaryAuthButton loading={loading} loadingText="Signing in...">
          Sign In
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
              callbackURL: nextPath,
            });

            if (res?.error) {
              setFormError(res.error.message || "Unable to continue with Google. Please try again.");
              return;
            }

            router.push(nextPath);
          } catch {
            setFormError("Unable to continue with Google. Please try again.");
          } finally {
            setGoogleLoading(false);
          }
        }}
      />

      <div className="mt-7">
        <AuthFooterLink text="Don't have an account?" linkText="Create one" to={nextPath === "/sell/apply" ? "/sign-up?next=%2Fsell%2Fapply" : "/sign-up"} />
      </div>
    </AuthCard>
  );
}
