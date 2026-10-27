import cors from 'cors';
import express, { type Express } from 'express';

import type { Env } from './config/env';
import {
  createErrorHandler,
  notFoundHandler,
} from './infrastructure/http/error-handler';
import { createCorsOptions } from './infrastructure/http/cors';
import type { Logger } from './infrastructure/logging/logger';
import { AuthController } from './modules/auth/auth.controller';
import { createAuthenticate } from './modules/auth/auth.middleware';
import { createAuthRateLimiter } from './modules/auth/auth.rate-limit';
import { createAuthRouter } from './modules/auth/auth.routes';
import type { AuthService } from './modules/auth/auth.service';
import { MealPlanController } from './modules/meal-plans/meal-plan.controller';
import { createMealPlanRouter } from './modules/meal-plans/meal-plan.routes';
import type { MealPlanService } from './modules/meal-plans/meal-plan.service';

export type AppDependencies = {
  env: Pick<Env, 'nodeEnv' | 'corsAllowedOrigins' | 'authRateLimitEnabled'>;
  logger: Logger;
  mealPlanService: MealPlanService;
  authService: AuthService;
};

/** Builds the Express app. No I/O happens here, so it is safe for tests and Lambda cold starts. */
export function createApp({
  env,
  logger,
  mealPlanService,
  authService,
}: AppDependencies): Express {
  const app = express();
  app.disable('x-powered-by');

  app.use(cors(createCorsOptions(env)));
  app.use(express.json({ limit: '100kb' }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  const authenticate = createAuthenticate(authService);
  app.use(
    '/api/v1/auth',
    createAuthRouter(
      new AuthController(authService),
      authenticate,
      createAuthRateLimiter(env.authRateLimitEnabled),
    ),
  );

  // Everything below requires a valid access token; handlers further scope data to the caller.
  app.use(
    '/api/v1/meal-plans',
    authenticate,
    createMealPlanRouter(new MealPlanController(mealPlanService)),
  );

  app.use(notFoundHandler);
  app.use(createErrorHandler(logger));
  return app;
}
