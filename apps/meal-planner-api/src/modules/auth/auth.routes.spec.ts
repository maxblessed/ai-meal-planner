import {
  apiErrorResponseSchema,
  authSessionResponseSchema,
  currentUserResponseSchema,
  refreshResponseSchema,
} from '@ai-meal-planner/shared';
import request from 'supertest';

import { bearer, createTestApp } from '../../testing/create-test-app';

const credentials = { email: 'Ada@Example.com', password: 'correct horse battery', displayName: 'Ada' };
const errorCode = (res: request.Response) => apiErrorResponseSchema.parse(res.body).error.code;

describe('POST /api/v1/auth/register', () => {
  it('creates an account, normalises the email and returns user + tokens (never the password hash)', async () => {
    const { app } = createTestApp();
    const res = await request(app).post('/api/v1/auth/register').send(credentials).expect(201);
    const { user, tokens } = authSessionResponseSchema.parse(res.body).data;

    expect(user).toMatchObject({ email: 'ada@example.com', displayName: 'Ada' });
    expect(tokens.accessTokenExpiresAt).toBe('2026-03-30T10:15:00.000Z');
    expect(tokens.refreshTokenExpiresAt).toBe('2026-04-29T10:00:00.000Z');
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|scrypt\$|correct horse/);
  });

  it('treats a blank display name as not provided', async () => {
    const res = await request(createTestApp().app).post('/api/v1/auth/register').send({ ...credentials, displayName: '   ' }).expect(201);
    expect(authSessionResponseSchema.parse(res.body).data.user.displayName).toBeUndefined();
  });

  it('rejects a duplicate email (case-insensitively) with 409', async () => {
    const { app, register } = createTestApp();
    await register('ada@example.com');
    const res = await request(app).post('/api/v1/auth/register').send({ ...credentials, email: 'ADA@example.com' }).expect(409);
    expect(errorCode(res)).toBe('EMAIL_ALREADY_REGISTERED');
  });

  it.each([
    ['invalid email', { email: 'nope' }, 'body.email'],
    ['short password', { password: 'short' }, 'body.password'],
    ['oversized password', { password: 'x'.repeat(129) }, 'body.password'],
    ['oversized display name', { displayName: 'x'.repeat(61) }, 'body.displayName'],
  ])('rejects %s with field details', async (_name, patch, path) => {
    const res = await request(createTestApp().app).post('/api/v1/auth/register').send({ ...credentials, ...patch }).expect(400);
    const error = apiErrorResponseSchema.parse(res.body).error;
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.details?.map((d) => d.path)).toContain(path);
  });

  it('does not echo the submitted password in validation errors', async () => {
    const res = await request(createTestApp().app).post('/api/v1/auth/register').send({ email: 'bad', password: 'hunter2-unique-marker' }).expect(400);
    expect(JSON.stringify(res.body)).not.toContain('hunter2-unique-marker');
  });
});

describe('POST /api/v1/auth/login', () => {
  it('logs in with the right credentials, regardless of email case', async () => {
    const { app, register } = createTestApp();
    await register('ada@example.com');
    const res = await request(app).post('/api/v1/auth/login').send({ email: 'ADA@example.com', password: 'correct horse battery' }).expect(200);
    expect(authSessionResponseSchema.parse(res.body).data.user.email).toBe('ada@example.com');
  });

  it('returns the same 401 for a wrong password and an unknown email', async () => {
    const { app, register } = createTestApp();
    await register('ada@example.com');
    const wrongPassword = await request(app).post('/api/v1/auth/login').send({ email: 'ada@example.com', password: 'wrong password!' }).expect(401);
    const unknownEmail = await request(app).post('/api/v1/auth/login').send({ email: 'nobody@example.com', password: 'wrong password!' }).expect(401);
    expect(errorCode(wrongPassword)).toBe('INVALID_CREDENTIALS');
    expect(unknownEmail.body).toEqual(wrongPassword.body);
  });

  it('validates the body', async () => {
    await request(createTestApp().app).post('/api/v1/auth/login').send({ email: 'ada@example.com' }).expect(400);
  });
});

describe('GET /api/v1/auth/me', () => {
  it('returns the current user for a valid token', async () => {
    const { app, register } = createTestApp();
    const { user, tokens } = await register('ada@example.com');
    const res = await request(app).get('/api/v1/auth/me').set(bearer(tokens.accessToken)).expect(200);
    expect(currentUserResponseSchema.parse(res.body).data.user).toEqual(user);
  });

  it.each([
    ['no header', undefined],
    ['wrong scheme', 'Basic abc'],
    ['garbage token', 'Bearer not-a-token'],
    ['empty bearer', 'Bearer '],
  ])('401 UNAUTHENTICATED with %s', async (_name, header) => {
    const req = request(createTestApp().app).get('/api/v1/auth/me');
    const res = await (header === undefined ? req : req.set('Authorization', header)).expect(401);
    expect(errorCode(res)).toBe('UNAUTHENTICATED');
  });

  it('401 TOKEN_EXPIRED once the access token has expired', async () => {
    const { app, clock, register } = createTestApp();
    const { tokens } = await register('ada@example.com');
    clock.advanceMinutes(16);
    const res = await request(app).get('/api/v1/auth/me').set(bearer(tokens.accessToken)).expect(401);
    expect(errorCode(res)).toBe('TOKEN_EXPIRED');
  });
});

describe('POST /api/v1/auth/refresh', () => {
  it('rotates tokens: the new pair works and the old refresh token does not', async () => {
    const { app, clock, register } = createTestApp();
    const { tokens } = await register('ada@example.com');
    clock.advanceMinutes(16);

    const res = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: tokens.refreshToken }).expect(200);
    const fresh = refreshResponseSchema.parse(res.body).data.tokens;
    expect(fresh.refreshToken).not.toBe(tokens.refreshToken);
    await request(app).get('/api/v1/auth/me').set(bearer(fresh.accessToken)).expect(200);

    const reuse = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: tokens.refreshToken }).expect(401);
    expect(errorCode(reuse)).toBe('INVALID_REFRESH_TOKEN');
  });

  it('revokes the whole session when a rotated token is replayed (theft detection)', async () => {
    const { app, register } = createTestApp();
    const { tokens } = await register('ada@example.com');
    const fresh = refreshResponseSchema.parse((await request(app).post('/api/v1/auth/refresh').send({ refreshToken: tokens.refreshToken })).body).data.tokens;

    await request(app).post('/api/v1/auth/refresh').send({ refreshToken: tokens.refreshToken }).expect(401); // attacker replays old token
    await request(app).post('/api/v1/auth/refresh').send({ refreshToken: fresh.refreshToken }).expect(401); // legit token is dead too
    await request(app).get('/api/v1/auth/me').set(bearer(fresh.accessToken)).expect(401); // and so is its access token
  });

  it('rejects unknown and expired refresh tokens', async () => {
    const { app, clock, register } = createTestApp({ refreshTokenDays: 1 });
    const { tokens } = await register('ada@example.com');
    await request(app).post('/api/v1/auth/refresh').send({ refreshToken: 'x'.repeat(64) }).expect(401);
    clock.advanceMinutes(24 * 60 + 1);
    const res = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: tokens.refreshToken }).expect(401);
    expect(errorCode(res)).toBe('INVALID_REFRESH_TOKEN');
  });
});

describe('POST /api/v1/auth/logout', () => {
  it('ends the session immediately: refresh token and access token both stop working', async () => {
    const { app, register } = createTestApp();
    const { tokens } = await register('ada@example.com');

    await request(app).post('/api/v1/auth/logout').send({ refreshToken: tokens.refreshToken }).expect(200, { data: { loggedOut: true } });

    await request(app).get('/api/v1/auth/me').set(bearer(tokens.accessToken)).expect(401);
    await request(app).post('/api/v1/auth/refresh').send({ refreshToken: tokens.refreshToken }).expect(401);
  });

  it('only ends that session; other devices stay signed in', async () => {
    const { app, register } = createTestApp();
    const first = await register('ada@example.com');
    const second = authSessionResponseSchema.parse(
      (await request(app).post('/api/v1/auth/login').send({ email: 'ada@example.com', password: 'correct horse battery' })).body,
    ).data;

    await request(app).post('/api/v1/auth/logout').send({ refreshToken: first.tokens.refreshToken }).expect(200);
    await request(app).get('/api/v1/auth/me').set(bearer(second.tokens.accessToken)).expect(200);
  });

  it('succeeds for unknown tokens (idempotent, reveals nothing) and validates the body', async () => {
    const { app } = createTestApp();
    await request(app).post('/api/v1/auth/logout').send({ refreshToken: 'y'.repeat(64) }).expect(200);
    await request(app).post('/api/v1/auth/logout').send({}).expect(400);
  });
});

describe('rate limiting', () => {
  it('returns 429 TOO_MANY_REQUESTS after repeated attempts, without affecting the other endpoints', async () => {
    const { app } = createTestApp({ rateLimit: true });
    const attempt = () => request(app).post('/api/v1/auth/login').send({ email: 'ada@example.com', password: 'wrong password!' });

    for (let i = 0; i < 20; i++) await attempt().expect(401);
    const blocked = await attempt().expect(429);
    expect(errorCode(blocked)).toBe('TOO_MANY_REQUESTS');

    await request(app).get('/health').expect(200);
    await request(app).post('/api/v1/auth/logout').send({ refreshToken: 'z'.repeat(64) }).expect(200);
  }, 30000);
});
