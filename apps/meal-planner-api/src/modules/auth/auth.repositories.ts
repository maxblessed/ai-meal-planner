import { randomBytes } from 'node:crypto';

import { connectToDatabase } from '../../infrastructure/database/mongodb';
import { RefreshTokenModel, UserModel } from './auth.models';
import {
  EmailTakenError,
  type NewUser,
  type RefreshTokenRecord,
  type RefreshTokenRepository,
  type UserRecord,
  type UserRepository,
} from './auth.types';

type Connection = { uri: string | undefined; dbName: string | undefined };

const isDuplicateKey = (error: unknown) => typeof error === 'object' && error !== null && (error as { code?: number }).code === 11000;

export class MongoUserRepository implements UserRepository {
  constructor(private readonly connection: Connection) {}

  private ready = () => connectToDatabase(this.connection.uri, this.connection.dbName);

  private toRecord(doc: { _id: unknown; email: string; displayName?: string | null; passwordHash: string; createdAt: string }): UserRecord {
    return {
      id: String(doc._id),
      email: doc.email,
      ...(doc.displayName && { displayName: doc.displayName }),
      passwordHash: doc.passwordHash,
      createdAt: doc.createdAt,
    };
  }

  async create(user: NewUser): Promise<UserRecord> {
    await this.ready();
    try {
      // The unique index on `email` is the source of truth; no check-then-insert race.
      return this.toRecord((await UserModel.create(user)).toObject());
    } catch (error) {
      if (isDuplicateKey(error)) throw new EmailTakenError();
      throw error;
    }
  }

  async findByEmail(email: string): Promise<UserRecord | null> {
    await this.ready();
    const doc = await UserModel.findOne({ email }).lean();
    return doc ? this.toRecord(doc) : null;
  }

  async findById(id: string): Promise<UserRecord | null> {
    await this.ready();
    if (!/^[a-f\d]{24}$/i.test(id)) return null;
    const doc = await UserModel.findById(id).lean();
    return doc ? this.toRecord(doc) : null;
  }
}

export class MongoRefreshTokenRepository implements RefreshTokenRepository {
  constructor(private readonly connection: Connection) {}

  private ready = () => connectToDatabase(this.connection.uri, this.connection.dbName);

  async create(record: Pick<RefreshTokenRecord, 'userId' | 'familyId' | 'tokenHash' | 'expiresAt'>): Promise<void> {
    await this.ready();
    await RefreshTokenModel.create(record);
  }

  async findByHash(tokenHash: string): Promise<RefreshTokenRecord | null> {
    await this.ready();
    const doc = await RefreshTokenModel.findOne({ tokenHash }).lean();
    if (!doc) return null;
    const { userId, familyId, expiresAt, usedAt, revokedAt } = doc;
    return { userId, familyId, tokenHash, expiresAt, ...(usedAt && { usedAt }), ...(revokedAt && { revokedAt }) };
  }

  async consume(tokenHash: string, at: Date): Promise<boolean> {
    await this.ready();
    const result = await RefreshTokenModel.updateOne(
      { tokenHash, usedAt: { $exists: false }, revokedAt: { $exists: false } },
      { $set: { usedAt: at } },
    );
    return result.modifiedCount === 1;
  }

  async revokeFamily(familyId: string, at: Date): Promise<void> {
    await this.ready();
    await RefreshTokenModel.updateMany({ familyId, revokedAt: { $exists: false } }, { $set: { revokedAt: at } });
  }

  async isFamilyActive(familyId: string, now: Date): Promise<boolean> {
    await this.ready();
    return (await RefreshTokenModel.exists({ familyId, revokedAt: { $exists: false }, expiresAt: { $gt: now } })) !== null;
  }
}

export class InMemoryUserRepository implements UserRepository {
  private readonly users = new Map<string, UserRecord>();

  async create(user: NewUser): Promise<UserRecord> {
    if ([...this.users.values()].some((existing) => existing.email === user.email)) throw new EmailTakenError();
    const created = { ...user, id: randomBytes(12).toString('hex') };
    this.users.set(created.id, created);
    return { ...created };
  }

  async findByEmail(email: string): Promise<UserRecord | null> {
    const found = [...this.users.values()].find((user) => user.email === email);
    return found ? { ...found } : null;
  }

  async findById(id: string): Promise<UserRecord | null> {
    const found = this.users.get(id);
    return found ? { ...found } : null;
  }
}

export class InMemoryRefreshTokenRepository implements RefreshTokenRepository {
  private readonly tokens = new Map<string, RefreshTokenRecord>();

  async create(record: Pick<RefreshTokenRecord, 'userId' | 'familyId' | 'tokenHash' | 'expiresAt'>): Promise<void> {
    this.tokens.set(record.tokenHash, { ...record });
  }

  async findByHash(tokenHash: string): Promise<RefreshTokenRecord | null> {
    const found = this.tokens.get(tokenHash);
    return found ? { ...found } : null;
  }

  async consume(tokenHash: string, at: Date): Promise<boolean> {
    const found = this.tokens.get(tokenHash);
    if (!found || found.usedAt || found.revokedAt) return false;
    found.usedAt = at;
    return true;
  }

  async revokeFamily(familyId: string, at: Date): Promise<void> {
    for (const token of this.tokens.values()) if (token.familyId === familyId && !token.revokedAt) token.revokedAt = at;
  }

  async isFamilyActive(familyId: string, now: Date): Promise<boolean> {
    return [...this.tokens.values()].some((t) => t.familyId === familyId && !t.revokedAt && t.expiresAt > now);
  }
}
