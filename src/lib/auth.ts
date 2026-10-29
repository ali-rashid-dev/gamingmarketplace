import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import prisma from "@/lib/prisma";
import { Resend } from "resend";
import ForgotPasswordEmail from "@/components/emails/reset-password";
import VerifyEmail from "@/components/emails/verify-email";

const resend = new Resend(process.env.RESEND_API_KEY as string);
const emailSender = process.env.RESEND_FROM_EMAIL;

if (!emailSender) {
    throw new Error("RESEND_FROM_EMAIL must be set to a sender address on a verified domain.");
}

export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: "postgresql",
    }),
    emailVerification: {
        sendVerificationEmail: async ({ user, url, token }, request) => {
            void resend.emails.send({
                from: emailSender,
                to: user.email,
                subject: "Verify your email address",
                react: VerifyEmail({
                    username: user.name,
                    verificationUrl: url,
                    userEmail: user.email,
                }),
            }).then(({ error }) => {
                if (error) {
                    console.error("Failed to send verification email", error);
                }
            }).catch((error: unknown) => {
                console.error("Failed to send verification email", error);
            });
        },
        sendOnSignUp: true,
        autoSignInAfterVerification: true,
    },
    emailAndPassword: {
        enabled: true,
        sendResetPassword: async ({ user, url, token }, request) => {
            const { error } = await resend.emails.send({
                from: emailSender,
                to: user.email,
                subject: 'Reset your password',
                react: ForgotPasswordEmail({
                    username: user.name,
                    resetUrl: url,
                    userEmail: user.email,
                })
            });
            if (error) {
                console.error("Failed to send password reset email", error);
                throw error;
            }
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