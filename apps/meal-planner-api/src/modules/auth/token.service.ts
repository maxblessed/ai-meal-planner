import { createHash, randomBytes } from 'node:crypto';

import { errors, jwtVerify, SignJWT } from 'jose';

import { AppError } from '../../infrastructure/http/errors';
import type { AuthContext } from './auth.types';

const ISSUER = 'ai-meal-planner-api';
const AUDIENCE = 'ai-meal-planner-app';

export const hashRefreshToken = (token: string) => createHash('sha256').update(token).digest('hex');
export const generateRefreshToken = () => randomBytes(48).toString('base64url');

type Options = {
  secret: string;
  accessTokenMinutes: number;
  now?: () => Date;
};

/** Signs and verifies short-lived access tokens (HS256 JWTs). */
export class TokenService {
  private readonly key: Uint8Array;
  private readonly ttlMs: number;
  private readonly now: () => Date;

  constructor({ secret, accessTokenMinutes, now = () => new Date() }: Options) {
    this.key = new TextEncoder().encode(secret);
    this.ttlMs = accessTokenMinutes * 60 * 1000;
    this.now = now;
  }

  async signAccessToken({ userId, sessionId }: AuthContext): Promise<{ token: string; expiresAt: Date }> {
    const issuedAt = this.now();
    const expiresAt = new Date(issuedAt.getTime() + this.ttlMs);
    const token = await new SignJWT({ sid: sessionId })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(userId)
      .setIssuer(ISSUER)
      .setAudience(AUDIENCE)
      .setIssuedAt(Math.floor(issuedAt.getTime() / 1000))
      .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
      .sign(this.key);
    return { token, expiresAt };
  }

  /** Throws TOKEN_EXPIRED for an expired token and UNAUTHENTICATED for anything else wrong with it. */
  async verifyAccessToken(token: string): Promise<AuthContext> {
    try {
      const { payload } = await jwtVerify(token, this.key, {
        algorithms: ['HS256'],
        issuer: ISSUER,
        audience: AUDIENCE,
        currentDate: this.now(),
      });
      if (typeof payload.sub !== 'string' || typeof payload['sid'] !== 'string') throw new Error('missing claims');
      return { userId: payload.sub, sessionId: payload['sid'] };
    } catch (error) {
      if (error instanceof errors.JWTExpired) throw new AppError('TOKEN_EXPIRED', 401, 'Your session has expired.');
      throw new AppError('UNAUTHENTICATED', 401, 'Authentication is required.');
    }
  }
}
