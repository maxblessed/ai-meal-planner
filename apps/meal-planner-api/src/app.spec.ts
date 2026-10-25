import { apiErrorResponseSchema, mealPlanListResponseSchema, mealPlanResponseSchema } from '@ai-meal-planner/shared';
import request from 'supertest';

import { createApp } from './app';
import { createLogger } from './infrastructure/logging/logger';
import { SampleMealGenerator } from './modules/meal-plans/generators/sample-meal-generator';
import { InMemoryMealPlanRepository, MongoMealPlanRepository } from './modules/meal-plans/meal-plan.repository';
import { MealPlanService } from './modules/meal-plans/meal-plan.service';

const app = () =>
  createApp({
    env: { nodeEnv: 'test', corsAllowedOrigins: undefined },
    logger: createLogger('silent'),
    mealPlanService: new MealPlanService({ repository: new InMemoryMealPlanRepository(), generator: new SampleMealGenerator() }),
  });

const body = {
  countryCode: 'IE',
  householdSize: 2,
  dietaryPreferences: [],
  allergies: [],
  dislikedIngredients: [],
  weeklyBudget: 80,
};

describe('meal plan API', () => {
  it('GET /health', async () => {
    await request(app()).get('/health').expect(200, { status: 'ok' });
  });

  it('POST creates a plan (201) matching the shared contract', async () => {
    const res = await request(app()).post('/api/v1/meal-plans').send(body).expect(201);
    const parsed = mealPlanResponseSchema.parse(res.body);
    expect(parsed.data.currencyCode).toBe('EUR');
    expect(parsed.data.generation.source).toBe('development-sample');
    expect(parsed.data.days).toHaveLength(7);
  });

  it('full flow: create → list → get → replace', async () => {
    const server = app();
    const created = (await request(server).post('/api/v1/meal-plans').send(body).expect(201)).body.data;

    const list = mealPlanListResponseSchema.parse((await request(server).get('/api/v1/meal-plans').expect(200)).body);
    expect(list.data.map((p) => p.id)).toEqual([created.id]);

    await request(server).get(`/api/v1/meal-plans/${created.id}`).expect(200);

    const mealId = created.days[0].meals[0].id;
    const replaced = (await request(server).post(`/api/v1/meal-plans/${created.id}/meals/${mealId}/replace`).expect(200)).body.data;
    expect(replaced.days[0].meals[0].id).toBe(mealId);
    expect(replaced.days[0].meals[0].title).not.toBe(created.days[0].meals[0].title);
  });

  it('POST returns 400 VALIDATION_ERROR with field paths', async () => {
    const res = await request(app()).post('/api/v1/meal-plans').send({ ...body, householdSize: 0, countryCode: 'US' }).expect(400);
    const parsed = apiErrorResponseSchema.parse(res.body);
    expect(parsed.error.code).toBe('VALIDATION_ERROR');
    expect(parsed.error.details?.map((d) => d.path)).toEqual(expect.arrayContaining(['body.householdSize', 'body.countryCode']));
  });

  it('POST returns 400 for malformed JSON and for an empty body', async () => {
    await request(app()).post('/api/v1/meal-plans').set('Content-Type', 'application/json').send('{nope').expect(400);
    await request(app()).post('/api/v1/meal-plans').expect(400);
  });

  it('POST returns 422 UNSATISFIABLE_PREFERENCES when the sample set cannot meet constraints', async () => {
    const res = await request(app())
      .post('/api/v1/meal-plans')
      .send({ ...body, dietaryPreferences: ['vegan', 'gluten-free', 'low-carb'] })
      .expect(422);
    expect(apiErrorResponseSchema.parse(res.body).error.code).toBe('UNSATISFIABLE_PREFERENCES');
  });

  it('GET :id returns 400 for malformed ids and 404 for unknown ones', async () => {
    await request(app()).get('/api/v1/meal-plans/not-an-id').expect(400);
    const res = await request(app()).get(`/api/v1/meal-plans/${'a'.repeat(24)}`).expect(404);
    expect(apiErrorResponseSchema.parse(res.body).error.code).toBe('NOT_FOUND');
  });

  it('replace returns 404 for an unknown meal and 400 for unexpected body fields', async () => {
    const server = app();
    const created = (await request(server).post('/api/v1/meal-plans').send(body)).body.data;
    await request(server).post(`/api/v1/meal-plans/${created.id}/meals/unknown/replace`).expect(404);
    await request(server)
      .post(`/api/v1/meal-plans/${created.id}/meals/${created.days[0].meals[0].id}/replace`)
      .send({ surprise: true })
      .expect(400);
  });

  it('returns a JSON 404 for unknown routes', async () => {
    const res = await request(app()).get('/api/v1/nope').expect(404);
    expect(apiErrorResponseSchema.parse(res.body).error.code).toBe('NOT_FOUND');
  });

  it('returns 503 SERVICE_UNAVAILABLE (without leaking details) when the database is not configured', async () => {
    const server = createApp({
      env: { nodeEnv: 'test', corsAllowedOrigins: undefined },
      logger: createLogger('silent'),
      mealPlanService: new MealPlanService({
        repository: new MongoMealPlanRepository({ uri: undefined }),
        generator: new SampleMealGenerator(),
      }),
    });
    const res = await request(server).get('/api/v1/meal-plans').expect(503);
    expect(apiErrorResponseSchema.parse(res.body).error.code).toBe('SERVICE_UNAVAILABLE');
    expect(JSON.stringify(res.body)).not.toMatch(/MONGODB_URI/);
  });
});
