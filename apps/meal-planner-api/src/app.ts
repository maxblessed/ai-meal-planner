import cors from 'cors';
import express, { type Express } from 'express';

import type { Env } from './config/env';
import { createErrorHandler, notFoundHandler } from './infrastructure/http/error-handler';
import type { Logger } from './infrastructure/logging/logger';
import { MealPlanController } from './modules/meal-plans/meal-plan.controller';
import { createMealPlanRouter } from './modules/meal-plans/meal-plan.routes';
import type { MealPlanService } from './modules/meal-plans/meal-plan.service';

export type AppDependencies = {
  env: Pick<Env, 'nodeEnv' | 'corsAllowedOrigins'>;
  logger: Logger;
  mealPlanService: MealPlanService;
};

/** Builds the Express app. No I/O happens here, so it is safe for tests and Lambda cold starts. */
export function createApp({ env, logger, mealPlanService }: AppDependencies): Express {
  const app = express();
  app.disable('x-powered-by');

  app.use(cors({ origin: env.corsAllowedOrigins ?? env.nodeEnv !== 'production' }));
  app.use(express.json({ limit: '100kb' }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // Development-only API: no authentication or ownership checks yet (see docs/api.md).
  app.use('/api/v1/meal-plans', createMealPlanRouter(new MealPlanController(mealPlanService)));

  app.use(notFoundHandler);
  app.use(createErrorHandler(logger));
  return app;
}
