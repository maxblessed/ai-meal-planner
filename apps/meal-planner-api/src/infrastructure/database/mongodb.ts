import mongoose from 'mongoose';

/** Raised when MongoDB isn't configured or can't be reached. Mapped to HTTP 503. */
export class DatabaseUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DatabaseUnavailableError';
  }
}

// Module scope survives across invocations while a Lambda container stays warm,
// so each container opens one connection instead of one per request.
let connecting: Promise<typeof mongoose> | undefined;

/**
 * Connects on first use (never at import time) and reuses the connection.
 * A failed attempt is not cached, so the next request retries.
 */
export async function connectToDatabase(uri: string | undefined, dbName: string | undefined): Promise<void> {
  if (!uri) {
    throw new DatabaseUnavailableError(
      'MONGODB_URI is not set. Configure it (see docs/api.md) or set USE_IN_MEMORY_REPOSITORY=true for local development.',
    );
  }
  // Required on purpose: without it Mongoose uses the database named in the URI, which on a shared
  // cluster may belong to a different application.
  if (!dbName) {
    throw new DatabaseUnavailableError('MONGODB_DB_NAME is not set. Refusing to fall back to the database in the URI.');
  }
  if (mongoose.connection.readyState === 1) return;

  connecting ??= mongoose
    .connect(uri, {
      dbName,
      // Fail fast instead of buffering commands for 10s inside a Lambda invocation.
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000,
      maxPoolSize: 5,
    })
    .catch((error: unknown) => {
      connecting = undefined;
      const reason = error instanceof Error ? error.message : String(error);
      // Never let a connection string (which may embed credentials) reach logs or responses.
      throw new DatabaseUnavailableError(`Could not connect to MongoDB: ${reason.replace(/mongodb(\+srv)?:\/\/\S+/gi, '[redacted-uri]')}`);
    });

  await connecting;
}
