import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import prisma from "@/lib/prisma";
import { Resend } from "resend";
import { after } from "next/server";
import ForgotPasswordEmail from "@/components/emails/reset-password";
import VerifyEmail from "@/components/emails/verify-email";

function getResend(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY must be set to send authentication emails.");
  }
  return new Resend(apiKey);
}

function requireEmailSender(): string {
  const emailSender = process.env.RESEND_FROM_EMAIL;
  if (!emailSender) {
    throw new Error("RESEND_FROM_EMAIL must be set to a sender address on a verified domain.");
  }

  return emailSender;
}

function requireAuthSecret(): string {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) {
    throw new Error("BETTER_AUTH_SECRET must be set to a unique, secure value.");
  }
  return secret;
}

export const auth = betterAuth({
    secret: requireAuthSecret(),
    database: prismaAdapter(prisma, {
        provider: "postgresql",
    }),
    session: {
        expiresIn: 60 * 60 * 24 * 7,
        updateAge: 60 * 60 * 24,
    },
    rateLimit: {
        enabled: true,
        storage: "database",
        window: 60,
        max: 100,
        customRules: {
            "/sign-in/email": { window: 60, max: 5 },
            "/sign-up/email": { window: 60, max: 5 },
            "/request-password-reset": { window: 60, max: 3 },
            "/send-verification-email": { window: 60, max: 3 },
        },
    },
    emailVerification: {
        expiresIn: 60 * 60,
        sendVerificationEmail: async ({ user, url }) => {
            try {
                const { error } = await getResend().emails.send({
                    from: requireEmailSender(),
                    to: user.email,
                    subject: "Verify your email address",
                    react: VerifyEmail({
                        username: user.name,
                        verificationUrl: url,
                        userEmail: user.email,
                    }),
                });
                if (error) {
                    console.error("Failed to send verification email", error);
                }
            } catch (error: unknown) {
                console.error("Failed to send verification email", error);
            }
        },
        sendOnSignUp: true,
        autoSignInAfterVerification: true,
    },
    emailAndPassword: {
        enabled: true,
        requireEmailVerification: true,
        resetPasswordTokenExpiresIn: 60 * 60,
        sendResetPassword: async ({ user, url }) => {
            after(async () => {
                try {
                    const { error } = await getResend().emails.send({
                        from: requireEmailSender(),
                        to: user.email,
                        subject: "Reset your password",
                        react: ForgotPasswordEmail({
                            username: user.name,
                            resetUrl: url,
                            userEmail: user.email,
                        }),
                    });
                    if (error) {
                        console.error("Failed to send password reset email", error);
                    }
                } catch (error: unknown) {
                    console.error("Failed to send password reset email", error);
                }
            });
        }

    },
    baseURL: process.env.BETTER_AUTH_URL,
    socialProviders: {
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
        },
    },
});