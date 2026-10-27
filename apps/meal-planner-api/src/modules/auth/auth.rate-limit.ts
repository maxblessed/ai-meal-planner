import type { RequestHandler } from 'express';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';

/**
 * Best-effort brute-force protection for credential endpoints. The counter is per server
 * instance (in memory), so on Lambda it only slows attackers down: put API Gateway throttling
 * or a WAF rate rule in front before any public deployment.
 */
export function createAuthRateLimiter(enabled: boolean): RequestHandler {
  if (!enabled) return (_req, _res, next) => next();
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    // On Lambda `req.ip` is undefined, which would put every caller in ONE shared bucket (a global lockout).
    // Prefer the source IP the adapter took from API Gateway; never trust a client-supplied X-Forwarded-For.
    // ipKeyGenerator groups IPv6 addresses by subnet so one user can't dodge the limit with a whole range.
    keyGenerator: (req) => ipKeyGenerator(req.clientIp ?? req.ip ?? 'unknown'),
    validate: { ip: false },
    handler: (_req, res) => {
      res.status(429).json({
        error: { code: 'TOO_MANY_REQUESTS', message: 'Too many attempts. Please wait a few minutes and try again.' },
      });
    },
  });
}
