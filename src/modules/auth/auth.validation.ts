import { z } from "zod";

/**
 * Client-side schemas, deliberately mirroring the server's.
 *
 * NOT a substitute for the server's — that one is authoritative and runs on
 * every request regardless. These exist so a parent finds out about a short
 * password before a round trip, and so the form can mark the offending field
 * rather than showing a banner about it.
 *
 * Where they differ from the server, the server wins and its message is shown.
 */

const email = z
  .string()
  .trim()
  .min(1, "Enter your email")
  .email("That doesn't look like an email address");

/**
 * Length carries the strength. A character-class rule is satisfied by
 * "Pass@123" and rejected by a genuinely strong passphrase, which is backwards —
 * NIST 800-63B says the same.
 */
const newPassword = z
  .string()
  .min(10, "At least 10 characters")
  .max(128, "That's too long");

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password"),
});

export const signupSchema = z
  .object({
    firstName: z.string().trim().min(1, "Enter your name").max(60),
    familyName: z.string().trim().min(1, "Enter a family name").max(80),
    email,
    password: newPassword,
    confirmPassword: z.string(),
    /**
     * Must be literally true. This account will hold a minor's learning records
     * and DPDP puts the burden of demonstrable consent on the operator, so an
     * unchecked box is a blocking validation error rather than a nudge.
     */
    consent: z.literal(true, {
      errorMap: () => ({ message: "Please accept to continue" }),
    }),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "The passwords don't match",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: newPassword,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "The passwords don't match",
    path: ["confirmPassword"],
  });

export const childSchema = z.object({
  name: z.string().trim().min(1, "Enter your child's name").max(60),
  grade: z.coerce.number().int().min(1).max(8),
  board: z.string().min(1, "Choose a board"),
  schoolMedium: z.string().min(1),
  homeLanguage: z.string().min(1),
  schoolName: z.string().trim().max(120).optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type ChildInput = z.infer<typeof childSchema>;
