import { createApp } from './app';
import { loadEnv, type Env } from './config/env';
import { createLogger, type Logger } from './infrastructure/logging/logger';
import { AuthService } from './modules/auth/auth.service';
import {
  InMemoryRefreshTokenRepository,
  InMemoryUserRepository,
  MongoRefreshTokenRepository,
  MongoUserRepository,
} from './modules/auth/auth.repositories';
import { ScryptPasswordHasher } from './modules/auth/password-hasher';
import { TokenService } from './modules/auth/token.service';
import { InMemoryMealPlanRepository, MongoMealPlanRepository } from './modules/meal-plans/meal-plan.repository';
import { MealPlanService } from './modules/meal-plans/meal-plan.service';
import { SampleMealGenerator } from './modules/meal-plans/generators/sample-meal-generator';

/** Composition root: the one place that chooses concrete implementations. */
export function createConfiguredApp(env: Env = loadEnv(), logger: Logger = createLogger(env.logLevel)) {
  const connection = { uri: env.mongoUri, dbName: env.mongoDbName };
  const useMemory = env.useInMemoryRepository;

  if (useMemory) logger.warn('using in-memory repositories: data is lost on restart');
  if (!useMemory && !env.mongoUri) logger.warn('MONGODB_URI is not set: API endpoints that need the database will return 503');
  if (!useMemory && env.mongoUri && !env.mongoDbName) logger.warn('MONGODB_DB_NAME is not set: API endpoints that need the database will return 503');

  const mealPlanRepository = useMemory ? new InMemoryMealPlanRepository() : new MongoMealPlanRepository(connection);

  // Swap SampleMealGenerator for an AI-backed MealPlanGenerator here later.
  const mealPlanService = new MealPlanService({ repository: mealPlanRepository, generator: new SampleMealGenerator() });

  const authService = new AuthService({
    users: useMemory ? new InMemoryUserRepository() : new MongoUserRepository(connection),
    refreshTokens: useMemory ? new InMemoryRefreshTokenRepository() : new MongoRefreshTokenRepository(connection),
    hasher: new ScryptPasswordHasher(),
    tokens: new TokenService({ secret: env.jwtSecret, accessTokenMinutes: env.accessTokenMinutes }),
    refreshTokenDays: env.refreshTokenDays,
  });

  return createApp({ env, logger, mealPlanService, authService });
}
