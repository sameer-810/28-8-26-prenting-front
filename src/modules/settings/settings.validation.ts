import { z } from "zod";

/**
 * The settings module's form rules.
 *
 * Mirrors the server's `newPasswordSchema` (10–128 characters, no character
 * classes) so the client never refuses a password the API would accept — the
 * two `refine`s below are the only rules this side adds, and both are about
 * catching a mistake before a round trip rather than about strength.
 */
export const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: z.string().min(10, "At least 10 characters").max(128),
    confirmPassword: z.string(),
  })
  /**
   * A mistyped confirmation is caught here rather than by the server, which
   * cannot see it — only this side knows what was typed twice.
   */
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "The passwords don't match",
    path: ["confirmPassword"],
  })
  /**
   * Re-submitting the current password would "succeed" and sign every other
   * device out for nothing. The server has no reason to reject it, so this is
   * the only place the pointlessness can be noticed.
   */
  .refine((v) => v.newPassword !== v.currentPassword, {
    message: "Choose a password you haven't used here before",
    path: ["newPassword"],
  });

export type PasswordInput = z.infer<typeof passwordSchema>;
