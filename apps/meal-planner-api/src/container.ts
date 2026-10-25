import { createApp } from './app';
import { loadEnv, type Env } from './config/env';
import { createLogger, type Logger } from './infrastructure/logging/logger';
import { InMemoryMealPlanRepository, MongoMealPlanRepository } from './modules/meal-plans/meal-plan.repository';
import { MealPlanService } from './modules/meal-plans/meal-plan.service';
import { SampleMealGenerator } from './modules/meal-plans/generators/sample-meal-generator';

/** Composition root: the one place that chooses concrete implementations. */
export function createConfiguredApp(env: Env = loadEnv(), logger: Logger = createLogger(env.logLevel)) {
  const repository = env.useInMemoryRepository
    ? new InMemoryMealPlanRepository()
    : new MongoMealPlanRepository({ uri: env.mongoUri, dbName: env.mongoDbName });

  if (env.useInMemoryRepository) logger.warn('using in-memory repository: data is lost on restart');
  if (!env.useInMemoryRepository && !env.mongoUri) logger.warn('MONGODB_URI is not set: meal plan endpoints will return 503');
  logger.warn('unauthenticated development API: do not expose publicly');

  // Swap SampleMealGenerator for an AI-backed MealPlanGenerator here later.
  const mealPlanService = new MealPlanService({ repository, generator: new SampleMealGenerator() });

  return createApp({ env, logger, mealPlanService });
}
