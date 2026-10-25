import { z } from 'zod';

const booleanFlag = z
  .enum(['true', 'false'])
  .optional()
  .transform((value) => value === 'true');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  /** MongoDB Atlas connection string. Never commit a real value. */
  MONGODB_URI: z.string().min(1).optional(),
  MONGODB_DB_NAME: z.string().min(1).optional(),
  /** Development only: store plans in process memory instead of MongoDB. */
  USE_IN_MEMORY_REPOSITORY: booleanFlag,
  /**
   * The API has no authentication yet. In production it refuses to start unless
   * this is explicitly set, so it can't be exposed by accident.
   */
  ALLOW_UNAUTHENTICATED_API: booleanFlag,
  /** Comma-separated list of allowed browser origins. Unset = all origins outside production, none in production. */
  CORS_ALLOWED_ORIGINS: z.string().optional(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error', 'silent']).default('info'),
});

export type Env = {
  nodeEnv: 'development' | 'test' | 'production';
  mongoUri?: string;
  mongoDbName?: string;
  useInMemoryRepository: boolean;
  allowUnauthenticatedApi: boolean;
  corsAllowedOrigins?: string[];
  logLevel: 'debug' | 'info' | 'warn' | 'error' | 'silent';
};

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

/** Parses environment variables. Does not touch the database, so it is safe at import time. */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const problems = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');
    throw new ConfigurationError(`Invalid environment configuration: ${problems}`);
  }
  const env = parsed.data;

  if (env.NODE_ENV === 'production' && env.USE_IN_MEMORY_REPOSITORY) {
    throw new ConfigurationError('USE_IN_MEMORY_REPOSITORY is not allowed in production.');
  }
  if (env.NODE_ENV === 'production' && !env.ALLOW_UNAUTHENTICATED_API) {
    throw new ConfigurationError(
      'Refusing to start in production: this API has no authentication or ownership checks yet. ' +
        'Add authentication, or set ALLOW_UNAUTHENTICATED_API=true to acknowledge the risk.',
    );
  }

  return {
    nodeEnv: env.NODE_ENV,
    mongoUri: env.MONGODB_URI,
    mongoDbName: env.MONGODB_DB_NAME,
    useInMemoryRepository: env.USE_IN_MEMORY_REPOSITORY,
    allowUnauthenticatedApi: env.ALLOW_UNAUTHENTICATED_API,
    corsAllowedOrigins: env.CORS_ALLOWED_ORIGINS?.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    logLevel: env.LOG_LEVEL,
  };
}
