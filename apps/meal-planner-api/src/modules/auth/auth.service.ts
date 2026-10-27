import { randomUUID } from 'node:crypto';

import type { AuthSession, AuthTokens, LoginRequest, RegisterRequest, User } from '@ai-meal-planner/shared';

import { AppError } from '../../infrastructure/http/errors';
import { EmailTakenError, type AuthContext, type RefreshTokenRepository, type UserRecord, type UserRepository } from './auth.types';
import type { PasswordHasher } from './password-hasher';
import { generateRefreshToken, hashRefreshToken, type TokenService } from './token.service';

type Dependencies = {
  users: UserRepository;
  refreshTokens: RefreshTokenRepository;
  hasher: PasswordHasher;
  tokens: TokenService;
  refreshTokenDays: number;
  now?: () => Date;
};

const DAY_MS = 24 * 60 * 60 * 1000;

const invalidCredentials = () => new AppError('INVALID_CREDENTIALS', 401, 'Incorrect email or password.');
const invalidRefreshToken = () => new AppError('INVALID_REFRESH_TOKEN', 401, 'Your session is no longer valid. Please sign in again.');

export const toUser = (record: UserRecord): User => ({
  id: record.id,
  email: record.email,
  ...(record.displayName && { displayName: record.displayName }),
  createdAt: record.createdAt,
});

export class AuthService {
  private readonly users: UserRepository;
  private readonly refreshTokens: RefreshTokenRepository;
  private readonly hasher: PasswordHasher;
  private readonly tokens: TokenService;
  private readonly refreshTokenDays: number;
  private readonly now: () => Date;
  private dummyHash?: Promise<string>;

  constructor(deps: Dependencies) {
    this.users = deps.users;
    this.refreshTokens = deps.refreshTokens;
    this.hasher = deps.hasher;
    this.tokens = deps.tokens;
    this.refreshTokenDays = deps.refreshTokenDays;
    this.now = deps.now ?? (() => new Date());
  }

  async register({ email, password, displayName }: RegisterRequest): Promise<AuthSession> {
    const passwordHash = await this.hasher.hash(password);
    try {
      const user = await this.users.create({
        email,
        displayName,
        passwordHash,
        createdAt: this.now().toISOString(),
      });
      return { user: toUser(user), tokens: await this.issueTokens(user.id, randomUUID()) };
    } catch (error) {
      if (error instanceof EmailTakenError) {
        throw new AppError('EMAIL_ALREADY_REGISTERED', 409, 'An account with this email already exists.');
      }
      throw error;
    }
  }

  async login({ email, password }: LoginRequest): Promise<AuthSession> {
    const user = await this.users.findByEmail(email);
    // Always do the hashing work so response time doesn't reveal whether the email exists.
    const valid = await this.hasher.verify(password, user?.passwordHash ?? (await this.getDummyHash()));
    if (!user || !valid) throw invalidCredentials();
    return { user: toUser(user), tokens: await this.issueTokens(user.id, randomUUID()) };
  }

  /** Rotates the refresh token. Presenting one that was already used revokes the whole session. */
  async refresh(refreshToken: string): Promise<AuthTokens> {
    const tokenHash = hashRefreshToken(refreshToken);
    const record = await this.refreshTokens.findByHash(tokenHash);
    if (!record || record.revokedAt) throw invalidRefreshToken();

    const now = this.now();
    if (record.usedAt) {
      // Reuse of a rotated token means it may have been stolen: end the session for everyone holding it.
      await this.refreshTokens.revokeFamily(record.familyId, now);
      throw invalidRefreshToken();
    }
    if (record.expiresAt <= now) throw invalidRefreshToken();

    if (!(await this.refreshTokens.consume(tokenHash, now))) {
      await this.refreshTokens.revokeFamily(record.familyId, now);
      throw invalidRefreshToken();
    }

    const user = await this.users.findById(record.userId);
    if (!user) {
      await this.refreshTokens.revokeFamily(record.familyId, now);
      throw invalidRefreshToken();
    }
    return this.issueTokens(user.id, record.familyId);
  }

  /** Ends the session the refresh token belongs to. Always succeeds, so clients can't probe tokens. */
  async logout(refreshToken: string): Promise<void> {
    const record = await this.refreshTokens.findByHash(hashRefreshToken(refreshToken));
    if (record) await this.refreshTokens.revokeFamily(record.familyId, this.now());
  }

  /** Verifies an access token and that its session hasn't been revoked (so logout is immediate). */
  async authenticate(accessToken: string): Promise<AuthContext> {
    const context = await this.tokens.verifyAccessToken(accessToken);
    if (!(await this.refreshTokens.isFamilyActive(context.sessionId, this.now()))) {
      throw new AppError('UNAUTHENTICATED', 401, 'Authentication is required.');
    }
    return context;
  }

  async getCurrentUser(userId: string): Promise<User> {
    const user = await this.users.findById(userId);
    if (!user) throw new AppError('UNAUTHENTICATED', 401, 'Authentication is required.');
    return toUser(user);
  }

  private async issueTokens(userId: string, familyId: string): Promise<AuthTokens> {
    const now = this.now();
    const refreshToken = generateRefreshToken();
    const refreshExpiresAt = new Date(now.getTime() + this.refreshTokenDays * DAY_MS);

    await this.refreshTokens.create({ userId, familyId, tokenHash: hashRefreshToken(refreshToken), expiresAt: refreshExpiresAt });
    const access = await this.tokens.signAccessToken({ userId, sessionId: familyId });

    return {
      accessToken: access.token,
      accessTokenExpiresAt: access.expiresAt.toISOString(),
      refreshToken,
      refreshTokenExpiresAt: refreshExpiresAt.toISOString(),
    };
  }

  private getDummyHash(): Promise<string> {
    this.dummyHash ??= this.hasher.hash(randomUUID());
    return this.dummyHash;
  }
}
