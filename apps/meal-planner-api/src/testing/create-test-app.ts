import type { AuthSession } from '@ai-meal-planner/shared';
import request from 'supertest';

import { createApp } from '../app';
import { createLogger } from '../infrastructure/logging/logger';
import { InMemoryRefreshTokenRepository, InMemoryUserRepository } from '../modules/auth/auth.repositories';
import { AuthService } from '../modules/auth/auth.service';
import { ScryptPasswordHasher } from '../modules/auth/password-hasher';
import { TokenService } from '../modules/auth/token.service';
import { SampleMealGenerator } from '../modules/meal-plans/generators/sample-meal-generator';
import { InMemoryMealPlanRepository } from '../modules/meal-plans/meal-plan.repository';
import { MealPlanService } from '../modules/meal-plans/meal-plan.service';
import type { MealPlanRepository } from '../modules/meal-plans/meal-plan.types';

export const TEST_SECRET = 'test-secret-test-secret-test-secret-0123456789';

/** Everything in memory, a cheap password hash and a clock the test controls. */
type Options = {
  accessTokenMinutes?: number;
  refreshTokenDays?: number;
  mealPlanRepository?: MealPlanRepository;
  rateLimit?: boolean;
};

export function createTestApp({ accessTokenMinutes = 15, refreshTokenDays = 30, mealPlanRepository, rateLimit = false }: Options = {}) {
  let current = new Date('2026-03-30T10:00:00Z');
  const clock = {
    now: () => new Date(current),
    advanceMinutes: (minutes: number) => {
      current = new Date(current.getTime() + minutes * 60_000);
    },
  };

  const refreshTokens = new InMemoryRefreshTokenRepository();
  const authService = new AuthService({
    users: new InMemoryUserRepository(),
    refreshTokens,
    hasher: new ScryptPasswordHasher({ N: 1024, r: 8, p: 1 }),
    tokens: new TokenService({ secret: TEST_SECRET, accessTokenMinutes, now: clock.now }),
    refreshTokenDays,
    now: clock.now,
  });
  const mealPlanService = new MealPlanService({
    repository: mealPlanRepository ?? new InMemoryMealPlanRepository(),
    generator: new SampleMealGenerator(),
    now: clock.now,
  });

  const app = createApp({
    env: { nodeEnv: 'test', corsAllowedOrigins: undefined, authRateLimitEnabled: rateLimit },
    logger: createLogger('silent'),
    mealPlanService,
    authService,
  });

  const register = async (email: string, password = 'correct horse battery'): Promise<AuthSession> =>
    (await request(app).post('/api/v1/auth/register').send({ email, password }).expect(201)).body.data;

  return { app, clock, authService, refreshTokens, register };
}

export const bearer = (accessToken: string) => ({ Authorization: `Bearer ${accessToken}` });
