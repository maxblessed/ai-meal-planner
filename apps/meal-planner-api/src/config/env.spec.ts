import { ConfigurationError, loadEnv } from './env';

describe('loadEnv', () => {
  it('defaults to development with no database configured', () => {
    expect(loadEnv({})).toMatchObject({ nodeEnv: 'development', useInMemoryRepository: false, mongoUri: undefined });
  });

  it('parses flags and origins', () => {
    const env = loadEnv({ USE_IN_MEMORY_REPOSITORY: 'true', CORS_ALLOWED_ORIGINS: 'http://a.test, http://b.test' });
    expect(env.useInMemoryRepository).toBe(true);
    expect(env.corsAllowedOrigins).toEqual(['http://a.test', 'http://b.test']);
  });

  it('refuses to start in production without acknowledging the missing authentication', () => {
    expect(() => loadEnv({ NODE_ENV: 'production' })).toThrow(ConfigurationError);
    expect(() => loadEnv({ NODE_ENV: 'production', ALLOW_UNAUTHENTICATED_API: 'true' })).not.toThrow();
  });

  it('never allows the in-memory repository in production', () => {
    expect(() =>
      loadEnv({ NODE_ENV: 'production', ALLOW_UNAUTHENTICATED_API: 'true', USE_IN_MEMORY_REPOSITORY: 'true' }),
    ).toThrow(/not allowed in production/);
  });

  it('rejects invalid values', () => {
    expect(() => loadEnv({ NODE_ENV: 'staging' })).toThrow(ConfigurationError);
  });
});
