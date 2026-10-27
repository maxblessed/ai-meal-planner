import cors from 'cors';
import express from 'express';
import request from 'supertest';

import { createCorsOptions } from './cors';

function appWith(env: Parameters<typeof createCorsOptions>[0]) {
  const app = express();
  app.use(cors(createCorsOptions(env)));
  app.get('/x', (_req, res) => res.json({ ok: true }));
  return app;
}

const allowOrigin = async (
  env: Parameters<typeof createCorsOptions>[0],
  origin: string,
) =>
  (
    await request(appWith(env))
      .options('/x')
      .set('Origin', origin)
      .set('Access-Control-Request-Method', 'GET')
  ).headers['access-control-allow-origin'];

describe('createCorsOptions', () => {
  const listed = {
    nodeEnv: 'development' as const,
    corsAllowedOrigins: ['http://localhost:4200'],
  };

  it('allows any localhost port in development even when a list is set', async () => {
    expect(await allowOrigin(listed, 'http://localhost:8081')).toBe(
      'http://localhost:8081',
    );
    expect(await allowOrigin(listed, 'http://127.0.0.1:19006')).toBe(
      'http://127.0.0.1:19006',
    );
  });

  it('allows listed origins and rejects other origins in development', async () => {
    expect(
      await allowOrigin(
        { ...listed, corsAllowedOrigins: ['https://app.example.com'] },
        'https://app.example.com',
      ),
    ).toBe('https://app.example.com');
    expect(
      await allowOrigin(listed, 'https://evil.example.com'),
    ).toBeUndefined();
    expect(
      await allowOrigin(listed, 'http://localhost.evil.com'),
    ).toBeUndefined();
  });

  it('allows only listed origins in production, never localhost', async () => {
    const prod = {
      nodeEnv: 'production' as const,
      corsAllowedOrigins: ['https://app.example.com'],
    };
    expect(await allowOrigin(prod, 'https://app.example.com')).toBe(
      'https://app.example.com',
    );
    expect(await allowOrigin(prod, 'http://localhost:8081')).toBeUndefined();
    expect(
      await allowOrigin({ nodeEnv: 'production' }, 'https://app.example.com'),
    ).toBeUndefined();
  });
});
