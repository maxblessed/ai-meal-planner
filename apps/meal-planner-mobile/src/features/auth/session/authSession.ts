import { ApiError, type ApiClient, type AuthTokens, type TokenProvider } from '@ai-meal-planner/shared';

import type { TokenStorage } from './tokenStorage';

type Listener = (tokens: AuthTokens | null) => void;

/** Refresh slightly early so a request never leaves with a token that expires in flight. */
const REFRESH_MARGIN_MS = 30_000;

/**
 * Holds the current tokens in memory, mirrors them to secure storage, and refreshes the
 * access token (one request at a time, even if many calls expire together).
 */
export class AuthSession implements TokenProvider {
  private tokens: AuthTokens | null = null;
  private refreshing: Promise<string | undefined> | null = null;
  private readonly listeners = new Set<Listener>();

  constructor(
    private readonly storage: TokenStorage,
    private readonly getClient: () => ApiClient,
    private readonly now: () => number = Date.now,
  ) {}

  /** Loads tokens saved by a previous launch. */
  async restore(): Promise<AuthTokens | null> {
    this.tokens = await this.storage.load();
    return this.tokens;
  }

  async setTokens(tokens: AuthTokens): Promise<void> {
    this.tokens = tokens;
    await this.storage.save(tokens);
    this.notify();
  }

  async clear(): Promise<void> {
    this.tokens = null;
    await this.storage.clear().catch(() => undefined);
    this.notify();
  }

  getRefreshToken(): string | undefined {
    return this.tokens?.refreshToken;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async getAccessToken(): Promise<string | undefined> {
    if (!this.tokens) return undefined;
    const expiresSoon = Date.parse(this.tokens.accessTokenExpiresAt) - this.now() < REFRESH_MARGIN_MS;
    return expiresSoon ? this.refreshAccessToken() : this.tokens.accessToken;
  }

  /**
   * Resolves the new access token, or undefined if the session can't be renewed (and was cleared).
   * Network failures reject, and keep the tokens so the user isn't signed out by a flaky connection.
   */
  refreshAccessToken(): Promise<string | undefined> {
    this.refreshing ??= this.doRefresh().finally(() => {
      this.refreshing = null;
    });
    return this.refreshing;
  }

  private async doRefresh(): Promise<string | undefined> {
    const refreshToken = this.tokens?.refreshToken;
    if (!refreshToken) return undefined;
    try {
      const fresh = await this.getClient().auth.refresh(refreshToken);
      await this.setTokens(fresh);
      return fresh.accessToken;
    } catch (error) {
      if (error instanceof ApiError && error.status && error.status >= 400 && error.status < 500 && error.status !== 429) {
        await this.clear(); // The server rejected the refresh token: this session is over.
        return undefined;
      }
      throw error;
    }
  }

  private notify() {
    for (const listener of this.listeners) listener(this.tokens);
  }
}
