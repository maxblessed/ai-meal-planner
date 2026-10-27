import type { CorsOptions } from 'cors';

import type { Env } from '../../config/env';

// Expo web and other dev servers pick their own port (8081, 8082, 19006, ...), so any port on a loopback host is fine
// outside production.
const LOCAL_DEV_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;

/**
 * Production: only the origins listed in CORS_ALLOWED_ORIGINS (none if unset).
 * Otherwise: the listed origins plus any localhost origin; with no list at all, every origin (local development only).
 */
export function createCorsOptions({
  nodeEnv,
  corsAllowedOrigins,
}: Pick<Env, 'nodeEnv' | 'corsAllowedOrigins'>): CorsOptions {
  const listed = new Set(corsAllowedOrigins ?? []);
  if (nodeEnv === 'production') return { origin: [...listed] };
  if (!corsAllowedOrigins) return { origin: true };
  return {
    origin: (origin, callback) =>
      callback(
        null,
        !origin || listed.has(origin) || LOCAL_DEV_ORIGIN.test(origin),
      ),
  };
}
