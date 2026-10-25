import { connectToDatabase, DatabaseUnavailableError } from './mongodb';

describe('connectToDatabase', () => {
  it('rejects without a connection string', async () => {
    await expect(connectToDatabase(undefined, 'db')).rejects.toThrow(/MONGODB_URI is not set/);
  });

  it('refuses to fall back to the database named in the URI when MONGODB_DB_NAME is missing', async () => {
    const error = await connectToDatabase('mongodb://user:secret@localhost:1/other_app', undefined).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(DatabaseUnavailableError);
    expect((error as Error).message).toMatch(/MONGODB_DB_NAME is not set/);
    expect((error as Error).message).not.toMatch(/secret|other_app/);
  });

  it('redacts connection strings from connection errors', async () => {
    // Port 1 refuses connections, so this fails fast with no real network or credentials.
    const error = await connectToDatabase('mongodb://user:secret@127.0.0.1:1/x?serverSelectionTimeoutMS=300', 'db').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(DatabaseUnavailableError);
    expect((error as Error).message).not.toMatch(/secret/);
  }, 15000);
});
