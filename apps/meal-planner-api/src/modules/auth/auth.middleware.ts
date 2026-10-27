import type { RequestHandler } from 'express';

import { AppError } from '../../infrastructure/http/errors';
import type { AuthService } from './auth.service';
import type { AuthContext } from './auth.types';

export function createAuthenticate(authService: AuthService): RequestHandler {
  return async (req, _res, next) => {
    try {
      const header = req.headers.authorization;
      const [scheme, token] = header?.split(' ') ?? [];
      if (scheme?.toLowerCase() !== 'bearer' || !token) {
        throw new AppError('UNAUTHENTICATED', 401, 'Authentication is required.');
      }
      req.auth = await authService.authenticate(token);
      next();
    } catch (error) {
      next(error);
    }
  };
}

/** Use inside handlers behind `authenticate`; fails closed if the middleware was ever omitted. */
export function requireAuth(req: { auth?: AuthContext }): AuthContext {
  if (!req.auth) throw new AppError('UNAUTHENTICATED', 401, 'Authentication is required.');
  return req.auth;
}
