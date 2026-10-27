import { z } from 'zod';

export const API_ERROR_CODES = [
  'VALIDATION_ERROR',
  /** Missing, malformed, invalid or revoked access token. */
  'UNAUTHENTICATED',
  /** The access token is valid but expired: refresh it and retry. */
  'TOKEN_EXPIRED',
  /** Wrong email or password. Deliberately identical for both. */
  'INVALID_CREDENTIALS',
  'INVALID_REFRESH_TOKEN',
  'EMAIL_ALREADY_REGISTERED',
  'TOO_MANY_REQUESTS',
  /** Also used when a resource belongs to someone else, so existence isn't revealed. */
  'NOT_FOUND',
  /** The requested diet/allergy/dislike combination can't be met by the available meals. */
  'UNSATISFIABLE_PREFERENCES',
  'NO_ALTERNATIVE_MEAL',
  'SERVICE_UNAVAILABLE',
  'INTERNAL_ERROR',
] as const;
export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

export const validationIssueSchema = z.object({
  /** Dot-separated path, prefixed by the request part: `body.householdSize`. */
  path: z.string(),
  message: z.string(),
});
export type ValidationIssue = z.infer<typeof validationIssueSchema>;

export const apiErrorResponseSchema = z.object({
  error: z.object({
    code: z.enum(API_ERROR_CODES),
    message: z.string(),
    details: z.array(validationIssueSchema).optional(),
  }),
});
export type ApiErrorResponse = z.infer<typeof apiErrorResponseSchema>;
