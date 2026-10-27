import { z } from 'zod';

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

export const emailSchema = z.string().trim().toLowerCase().email('Enter a valid email address').max(254);

/** Length-based rules only (no composition requirements), per current NIST guidance. */
export const newPasswordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Use at least ${PASSWORD_MIN_LENGTH} characters`)
  .max(PASSWORD_MAX_LENGTH, `Use at most ${PASSWORD_MAX_LENGTH} characters`);

export const registerRequestSchema = z.object({
  email: emailSchema,
  password: newPasswordSchema,
  // An empty name (a blank form field) means "not provided".
  displayName: z
    .string()
    .trim()
    .max(60, 'Use at most 60 characters')
    .transform((value) => value || undefined)
    .optional(),
});
export type RegisterRequest = z.input<typeof registerRequestSchema>;

export const loginRequestSchema = z.object({
  email: emailSchema,
  // No strength rules at login: only reject empty/oversized input.
  password: z.string().min(1, 'Enter your password').max(PASSWORD_MAX_LENGTH),
});
export type LoginRequest = z.input<typeof loginRequestSchema>;

export const refreshTokenSchema = z.string().min(20).max(512);
export const refreshRequestSchema = z.object({ refreshToken: refreshTokenSchema });
export const logoutRequestSchema = refreshRequestSchema;

export const userSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  displayName: z.string().optional(),
  createdAt: z.string().datetime(),
});
export type User = z.infer<typeof userSchema>;

export const authTokensSchema = z.object({
  accessToken: z.string().min(1),
  accessTokenExpiresAt: z.string().datetime(),
  refreshToken: z.string().min(1),
  refreshTokenExpiresAt: z.string().datetime(),
});
export type AuthTokens = z.infer<typeof authTokensSchema>;

export const authSessionResponseSchema = z.object({ data: z.object({ user: userSchema, tokens: authTokensSchema }) });
export const refreshResponseSchema = z.object({ data: z.object({ tokens: authTokensSchema }) });
export const currentUserResponseSchema = z.object({ data: z.object({ user: userSchema }) });
export const logoutResponseSchema = z.object({ data: z.object({ loggedOut: z.literal(true) }) });
export type AuthSession = z.infer<typeof authSessionResponseSchema>['data'];
