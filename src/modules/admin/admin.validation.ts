import { z } from "zod";

/**
 * Mirrors the server's `admin.validation.js` — it stays authoritative. This is
 * only so a staff member is told what is wrong before a round trip, and so the
 * mandatory "why" note cannot be left empty by accident.
 */

export const adminLoginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Enter your work email")
    .email("That doesn't look like an email"),
  password: z.string().min(1, "Enter your password"),
});

export type AdminLoginInput = z.infer<typeof adminLoginSchema>;

/**
 * `min(3)` matches the server exactly.
 *
 * A note is required on both write operations, and the reason is recorded in
 * the activity log against the staff member who made the change. Three
 * characters is not a meaningful audit trail on its own — it is the floor that
 * stops an empty string, and the log is what makes a billing dispute answerable
 * six months later.
 */
export const planChangeSchema = z.object({
  planCode: z.enum(["trial", "basic_monthly", "family_annual", "family_plus"]),
  note: z.string().trim().min(3, "Say why this plan is being changed").max(300),
});

export type PlanChangeInput = z.infer<typeof planChangeSchema>;

export const activeChangeSchema = z.object({
  note: z.string().trim().min(3, "Say why").max(300),
});

export type ActiveChangeInput = z.infer<typeof activeChangeSchema>;

/**
 * Matches the server's `newPasswordSchema` exactly: 10–128 characters, no
 * character classes. Do not make it stricter here — a client that refuses what
 * the server accepts is a form rejecting a valid password with an error nobody
 * can override. Strengthen `validationPrimitives.js` instead; both ends read it.
 */
export const createAdminSchema = z.object({
  name: z.string().trim().min(1, "Enter their name").max(80),
  email: z
    .string()
    .trim()
    .min(1, "Enter their work email")
    .email("That doesn't look like an email"),
  password: z.string().min(10, "At least 10 characters").max(128),
  role: z.enum(["superadmin", "support"]),
});

export type CreateAdminInput = z.infer<typeof createAdminSchema>;
