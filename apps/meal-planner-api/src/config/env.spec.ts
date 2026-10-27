import { ConfigurationError, loadEnv } from './env';

const SECRET = 'a-test-only-secret-of-sufficient-length-0123';
const base = { JWT_SECRET: SECRET };

describe('loadEnv', () => {
  it('defaults to development with no database configured', () => {
    expect(loadEnv(base)).toMatchObject({
      nodeEnv: 'development',
      useInMemoryRepository: false,
      mongoUri: undefined,
      accessTokenMinutes: 15,
      refreshTokenDays: 30,
      authRateLimitEnabled: true,
    });
  });

  it('requires a JWT secret of at least 32 characters', () => {
    expect(() => loadEnv({})).toThrow(ConfigurationError);
    expect(() => loadEnv({ JWT_SECRET: 'too-short' })).toThrow(/at least 32/);
  });

  it('does not leak the secret in configuration errors', () => {
    const bad = 'short-secret-value';
    try {
      loadEnv({ JWT_SECRET: bad });
    } catch (error) {
      expect((error as Error).message).not.toContain(bad);
    }
  });

  it('parses flags, token lifetimes and origins', () => {
    const env = loadEnv({
      ...base,
      USE_IN_MEMORY_REPOSITORY: 'true',
      REFRESH_TOKEN_DAYS: '7',
      ACCESS_TOKEN_MINUTES: '5',
      CORS_ALLOWED_ORIGINS: 'http://a.test, http://b.test',
    });
    expect(env).toMatchObject({ useInMemoryRepository: true, refreshTokenDays: 7, accessTokenMinutes: 5 });
    expect(env.corsAllowedOrigins).toEqual(['http://a.test', 'http://b.test']);
  });

  it('never allows the in-memory repository in production', () => {
    expect(() => loadEnv({ ...base, NODE_ENV: 'production', USE_IN_MEMORY_REPOSITORY: 'true' })).toThrow(/not allowed in production/);
  });

  it('rejects invalid values', () => {
    expect(() => loadEnv({ ...base, NODE_ENV: 'staging' })).toThrow(ConfigurationError);
    expect(() => loadEnv({ ...base, REFRESH_TOKEN_DAYS: '0' })).toThrow(ConfigurationError);
  });
});
