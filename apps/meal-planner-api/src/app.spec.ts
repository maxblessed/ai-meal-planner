import { apiErrorResponseSchema, mealPlanListResponseSchema, mealPlanResponseSchema } from '@ai-meal-planner/shared';
import request from 'supertest';

import { MongoMealPlanRepository } from './modules/meal-plans/meal-plan.repository';
import { bearer, createTestApp } from './testing/create-test-app';

const body = {
  countryCode: 'IE',
  householdSize: 2,
  dietaryPreferences: [],
  allergies: [],
  dislikedIngredients: [],
  weeklyBudget: 80,
};

const errorCode = (res: request.Response) => apiErrorResponseSchema.parse(res.body).error.code;

/** An app with one signed-in user, plus a helper for authenticated requests. */
async function signedInApp() {
  const test = createTestApp();
  const session = await test.register('ada@example.com');
  const auth = bearer(session.tokens.accessToken);
  return { ...test, auth };
}

describe('GET /health', () => {
  it('is public', async () => {
    await request(createTestApp().app).get('/health').expect(200, { status: 'ok' });
  });
});

describe('meal plan routes require authentication', () => {
  it.each([
    ['post', '/api/v1/meal-plans'],
    ['get', '/api/v1/meal-plans'],
    ['get', `/api/v1/meal-plans/${'a'.repeat(24)}`],
    ['post', `/api/v1/meal-plans/${'a'.repeat(24)}/meals/m1/replace`],
  ] as const)('%s %s → 401 without a token', async (method, path) => {
    const res = await request(createTestApp().app)[method](path).send(method === 'post' ? body : undefined).expect(401);
    expect(errorCode(res)).toBe('UNAUTHENTICATED');
  });

  it('401 TOKEN_EXPIRED with an expired token, 401 after logout, 401 for garbage', async () => {
    const { app, clock, register } = createTestApp();
    const { tokens } = await register('ada@example.com');

    await request(app).get('/api/v1/meal-plans').set('Authorization', 'Bearer garbage').expect(401);

    await request(app).post('/api/v1/auth/logout').send({ refreshToken: tokens.refreshToken }).expect(200);
    const afterLogout = await request(app).get('/api/v1/meal-plans').set(bearer(tokens.accessToken)).expect(401);
    expect(errorCode(afterLogout)).toBe('UNAUTHENTICATED');

    const second = await register('grace@example.com');
    clock.advanceMinutes(16);
    const expired = await request(app).get('/api/v1/meal-plans').set(bearer(second.tokens.accessToken)).expect(401);
    expect(errorCode(expired)).toBe('TOKEN_EXPIRED');
  });
});

describe('meal plan API (authenticated)', () => {
  it('POST creates a plan (201) matching the shared contract, without leaking the owner', async () => {
    const { app, auth } = await signedInApp();
    const res = await request(app).post('/api/v1/meal-plans').set(auth).send(body).expect(201);
    const parsed = mealPlanResponseSchema.parse(res.body);
    expect(parsed.data.currencyCode).toBe('EUR');
    expect(parsed.data.generation.source).toBe('development-sample');
    expect(parsed.data.days).toHaveLength(7);
    expect(JSON.stringify(res.body)).not.toMatch(/ownerId/);
  });

  it('full flow: create → list → get → replace', async () => {
    const { app, auth } = await signedInApp();
    const created = (await request(app).post('/api/v1/meal-plans').set(auth).send(body).expect(201)).body.data;

    const list = mealPlanListResponseSchema.parse((await request(app).get('/api/v1/meal-plans').set(auth).expect(200)).body);
    expect(list.data.map((p) => p.id)).toEqual([created.id]);

    await request(app).get(`/api/v1/meal-plans/${created.id}`).set(auth).expect(200);

    const mealId = created.days[0].meals[0].id;
    const replaced = (await request(app).post(`/api/v1/meal-plans/${created.id}/meals/${mealId}/replace`).set(auth).expect(200)).body.data;
    expect(replaced.days[0].meals[0].id).toBe(mealId);
    expect(replaced.days[0].meals[0].title).not.toBe(created.days[0].meals[0].title);
  });

  it('POST returns 400 VALIDATION_ERROR with field paths', async () => {
    const { app, auth } = await signedInApp();
    const res = await request(app).post('/api/v1/meal-plans').set(auth).send({ ...body, householdSize: 0, countryCode: 'US' }).expect(400);
    const error = apiErrorResponseSchema.parse(res.body).error;
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.details?.map((d) => d.path)).toEqual(expect.arrayContaining(['body.householdSize', 'body.countryCode']));
  });

  it('POST returns 400 for malformed JSON and for an empty body', async () => {
    const { app, auth } = await signedInApp();
    await request(app).post('/api/v1/meal-plans').set(auth).set('Content-Type', 'application/json').send('{nope').expect(400);
    await request(app).post('/api/v1/meal-plans').set(auth).expect(400);
  });

  it('POST returns 422 UNSATISFIABLE_PREFERENCES when the sample set cannot meet constraints', async () => {
    const { app, auth } = await signedInApp();
    const res = await request(app).post('/api/v1/meal-plans').set(auth).send({ ...body, dietaryPreferences: ['vegan', 'gluten-free', 'low-carb'] }).expect(422);
    expect(errorCode(res)).toBe('UNSATISFIABLE_PREFERENCES');
  });

  it('GET :id returns 400 for malformed ids and 404 for unknown ones', async () => {
    const { app, auth } = await signedInApp();
    await request(app).get('/api/v1/meal-plans/not-an-id').set(auth).expect(400);
    const res = await request(app).get(`/api/v1/meal-plans/${'a'.repeat(24)}`).set(auth).expect(404);
    expect(errorCode(res)).toBe('NOT_FOUND');
  });

  it('replace returns 404 for an unknown meal and 400 for unexpected body fields', async () => {
    const { app, auth } = await signedInApp();
    const created = (await request(app).post('/api/v1/meal-plans').set(auth).send(body)).body.data;
    await request(app).post(`/api/v1/meal-plans/${created.id}/meals/unknown/replace`).set(auth).expect(404);
    await request(app).post(`/api/v1/meal-plans/${created.id}/meals/${created.days[0].meals[0].id}/replace`).set(auth).send({ surprise: true }).expect(400);
  });

  it('returns a JSON 404 for unknown routes', async () => {
    const res = await request(createTestApp().app).get('/api/v1/nope').expect(404);
    expect(errorCode(res)).toBe('NOT_FOUND');
  });
});

describe('ownership enforcement', () => {
  async function twoUsers() {
    const test = createTestApp();
    const ada = bearer((await test.register('ada@example.com')).tokens.accessToken);
    const grace = bearer((await test.register('grace@example.com')).tokens.accessToken);
    const plan = (await request(test.app).post('/api/v1/meal-plans').set(ada).send(body).expect(201)).body.data;
    return { ...test, ada, grace, plan };
  }

  it("lists only the caller's own plans", async () => {
    const { app, ada, grace, plan } = await twoUsers();
    const own = await request(app).get('/api/v1/meal-plans').set(ada).expect(200);
    expect(own.body.data.map((p: { id: string }) => p.id)).toEqual([plan.id]);
    expect((await request(app).get('/api/v1/meal-plans').set(grace).expect(200)).body.data).toEqual([]);
  });

  it("another user gets 404 (not 403) for someone else's plan, identical to a plan that doesn't exist", async () => {
    const { app, grace, plan } = await twoUsers();
    const foreign = await request(app).get(`/api/v1/meal-plans/${plan.id}`).set(grace).expect(404);
    const missing = await request(app).get(`/api/v1/meal-plans/${'f'.repeat(24)}`).set(grace).expect(404);
    expect(foreign.body).toEqual(missing.body);
  });

  it("another user cannot replace a meal in someone else's plan, and the plan is unchanged", async () => {
    const { app, ada, grace, plan } = await twoUsers();
    const mealId = plan.days[0].meals[0].id;
    await request(app).post(`/api/v1/meal-plans/${plan.id}/meals/${mealId}/replace`).set(grace).expect(404);

    const after = (await request(app).get(`/api/v1/meal-plans/${plan.id}`).set(ada).expect(200)).body.data;
    expect(after).toEqual(plan);
  });

  it('an owner keeps access across logins, and sees nothing of others', async () => {
    const { app, grace, plan } = await twoUsers();
    const again = (await request(app).post('/api/v1/auth/login').send({ email: 'ada@example.com', password: 'correct horse battery' }).expect(200)).body.data;
    await request(app).get(`/api/v1/meal-plans/${plan.id}`).set(bearer(again.tokens.accessToken)).expect(200);
    await request(app).get(`/api/v1/meal-plans/${plan.id}`).set(grace).expect(404);
  });
});

describe('database availability', () => {
  it('returns 503 SERVICE_UNAVAILABLE (without leaking config) when MongoDB is not configured', async () => {
    const { app, register } = createTestApp({ mealPlanRepository: new MongoMealPlanRepository({ uri: undefined, dbName: undefined }) });
    const { tokens } = await register('ada@example.com');
    const res = await request(app).get('/api/v1/meal-plans').set(bearer(tokens.accessToken)).expect(503);
    expect(errorCode(res)).toBe('SERVICE_UNAVAILABLE');
    expect(JSON.stringify(res.body)).not.toMatch(/MONGODB_/);
  });
});
