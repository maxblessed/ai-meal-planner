import express from 'express';
import request from 'supertest';

import { createAuthRateLimiter } from './auth.rate-limit';

/** A tiny app where the test decides each caller's IP, as the Lambda adapter does from API Gateway. */
function appWithClientIp(header: string | undefined) {
  const app = express();
  app.use((req, _res, next) => {
    if (header) req.clientIp = req.header(header);
    next();
  });
  app.post('/attempt', createAuthRateLimiter(true), (_req, res) => {
    res.json({ ok: true });
  });
  return app;
}

const burst = async (app: express.Express, ip: string, times: number) => {
  const statuses: number[] = [];
  for (let i = 0; i < times; i++) statuses.push((await request(app).post('/attempt').set('x-test-ip', ip)).status);
  return statuses;
};

describe('createAuthRateLimiter', () => {
  it('blocks a caller after 20 attempts but keeps serving other callers', async () => {
    const app = appWithClientIp('x-test-ip');
    const first = await burst(app, '203.0.113.1', 21);
    expect(first.slice(0, 20).every((s) => s === 200)).toBe(true);
    expect(first[20]).toBe(429);

    expect((await request(app).post('/attempt').set('x-test-ip', '203.0.113.2')).status).toBe(200);
  }, 30000);

  it('does not crash or share one global bucket when no IP is available (e.g. Lambda without a source IP)', async () => {
    const app = appWithClientIp(undefined);
    expect((await request(app).post('/attempt')).status).toBe(200);
  });

  it('is a no-op when disabled', async () => {
    const app = express();
    app.post('/attempt', createAuthRateLimiter(false), (_req, res) => {
      res.json({ ok: true });
    });
    for (let i = 0; i < 25; i++) await request(app).post('/attempt').expect(200);
  });
});
