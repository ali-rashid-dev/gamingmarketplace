import { z } from "zod";

// ─── Reusable error strings ────────────────────────────────────────────────
export const REQUIRED_MESSAGE = "This field is required";
export const MISMATCH_MESSAGE = "Passwords do not match";

// ─── Zod Schemas ──────────────────────────────────────────────────────────

export const nameSchema = z
  .string()
  .min(1, "Name is required")
  .min(2, "Name must be at least 2 characters")
  .max(80, "Name must be 80 characters or fewer");

export const emailSchema = z
  .string()
  .min(1, "Email is required")
  .email("Please enter a valid email address");

export const passwordSchema = z
  .string()
  .min(1, "Password is required")
  .min(8, "Password must be at least 8 characters long")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[\d\W]/, "Password must contain at least one number or symbol");

export const signUpSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
});

export const signInSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirm: z.string().min(1, REQUIRED_MESSAGE),
  })
  .refine((data) => data.password === data.confirm, {
    message: MISMATCH_MESSAGE,
    path: ["confirm"],
  });

// ─── Inferred types ────────────────────────────────────────────────────────
export type SignUpValues = z.infer<typeof signUpSchema>;
export type SignInValues = z.infer<typeof signInSchema>;
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

// ─── Field-level helpers (used by individual form fields) ──────────────────
// Each returns the first error message string or undefined.

export function validateRequired(value: string, name = "This field"): string | undefined {
  const result = z.string().min(1, `${name} is required`).safeParse(value);
  return result.success ? undefined : result.error.issues[0]?.message;
}

export function validateEmail(email: string): string | undefined {
  const result = emailSchema.safeParse(email);
  return result.success ? undefined : result.error.issues[0]?.message;
}

export function validatePassword(password: string): string | undefined {
  const result = passwordSchema.safeParse(password);
  return result.success ? undefined : result.error.issues[0]?.message;
}

// ─── Full-form parse helper (returns flat field → message error map) ───────
export function parseForm<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown,
): { success: true; data: z.infer<T> } | { success: false; errors: Record<string, string> } {
  const result = schema.safeParse(data);
  if (result.success) return { success: true, data: result.data };

  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join(".");
    if (key && !errors[key]) errors[key] = issue.message;
  }
  return { success: false, errors };
}
