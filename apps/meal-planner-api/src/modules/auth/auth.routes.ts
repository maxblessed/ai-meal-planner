import { loginRequestSchema, logoutRequestSchema, refreshRequestSchema, registerRequestSchema } from '@ai-meal-planner/shared';
import { Router, type RequestHandler } from 'express';

import { validate } from '../../infrastructure/http/validate';
import type { AuthController } from './auth.controller';

export function createAuthRouter(controller: AuthController, authenticate: RequestHandler, limiter: RequestHandler): Router {
  const router = Router();

  // Credential-bearing endpoints are rate limited; `me` and `logout` aren't guessable targets.
  router.post('/register', limiter, validate({ body: registerRequestSchema }), controller.register);
  router.post('/login', limiter, validate({ body: loginRequestSchema }), controller.login);
  router.post('/refresh', limiter, validate({ body: refreshRequestSchema }), controller.refresh);
  router.post('/logout', validate({ body: logoutRequestSchema }), controller.logout);
  router.get('/me', authenticate, controller.me);

  return router;
}
