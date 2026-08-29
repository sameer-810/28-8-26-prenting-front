import { z } from "zod";

/**
 * Client-side shapes for the console's three forms.
 *
 * These MIRROR the server's Zod schemas in `admin.validation.js` — they do not
 * replace them. The server is the authority; this exists so a staff member is
 * told what is wrong before a round trip, and so the "why is this changing?"
 * note cannot be left empty by accident on a form that is about to alter what a
 * household pays.
 */

export const adminLoginSchema = z.object({
  email: z.string().trim().min(1, "Enter your work email").email("That doesn't look like an email"),
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
 * character-class rules.
 *
 * An earlier draft of this file also demanded an uppercase letter, a lowercase
 * letter and a digit — stricter than the API, and therefore wrong. A client
 * that refuses what the server would accept is not extra safety; it is a form
 * rejecting a valid password with an error the server never wrote and nobody
 * can override. If staff passwords should be stronger, the rule belongs in
 * `validationPrimitives.js` where both ends read it.
 */
export const createAdminSchema = z.object({
  name: z.string().trim().min(1, "Enter their name").max(80),
  email: z.string().trim().min(1, "Enter their work email").email("That doesn't look like an email"),
  password: z.string().min(10, "At least 10 characters").max(128),
  role: z.enum(["superadmin", "support"]),
});

export type CreateAdminInput = z.infer<typeof createAdminSchema>;
