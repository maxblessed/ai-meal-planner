export type UserRecord = {
  id: string;
  /** Normalised (trimmed, lower-case). */
  email: string;
  displayName?: string;
  passwordHash: string;
  createdAt: string;
};

export type NewUser = Omit<UserRecord, 'id'>;

/** Thrown by repositories when the (unique) email already exists. */
export class EmailTakenError extends Error {
  constructor() {
    super('Email already registered');
    this.name = 'EmailTakenError';
  }
}

export interface UserRepository {
  create(user: NewUser): Promise<UserRecord>;
  findByEmail(email: string): Promise<UserRecord | null>;
  findById(id: string): Promise<UserRecord | null>;
}

export type RefreshTokenRecord = {
  userId: string;
  /** All tokens issued from one login share a family; revoking it ends that session. */
  familyId: string;
  /** SHA-256 of the token. The token itself is never stored. */
  tokenHash: string;
  expiresAt: Date;
  usedAt?: Date;
  revokedAt?: Date;
};

export interface RefreshTokenRepository {
  create(record: Pick<RefreshTokenRecord, 'userId' | 'familyId' | 'tokenHash' | 'expiresAt'>): Promise<void>;
  findByHash(tokenHash: string): Promise<RefreshTokenRecord | null>;
  /** Atomically consumes an unused, unrevoked token. Returns false if someone else already did. */
  consume(tokenHash: string, at: Date): Promise<boolean>;
  revokeFamily(familyId: string, at: Date): Promise<void>;
  /** True while the family has an unrevoked, unexpired token. */
  isFamilyActive(familyId: string, now: Date): Promise<boolean>;
}

export type AuthContext = { userId: string; sessionId: string };

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** Set by the `authenticate` middleware. */
      auth?: AuthContext;
      /** Caller IP supplied by the hosting adapter (API Gateway's source IP on Lambda). Falls back to `req.ip`. */
      clientIp?: string;
    }
  }
}
