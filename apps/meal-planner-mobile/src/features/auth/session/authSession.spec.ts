import { ApiError, type ApiClient, type AuthTokens } from '@ai-meal-planner/shared';

import { AuthSession } from './authSession';
import { createMemoryTokenStorage } from './tokenStorage';

jest.mock('expo-secure-store', () => ({ getItemAsync: jest.fn(), setItemAsync: jest.fn(), deleteItemAsync: jest.fn(), WHEN_UNLOCKED_THIS_DEVICE_ONLY: 1 }));

const NOW = Date.parse('2026-03-30T10:00:00Z');
const tokens = (overrides: Partial<AuthTokens> = {}): AuthTokens => ({
  accessToken: 'access-1',
  accessTokenExpiresAt: '2026-03-30T10:15:00.000Z',
  refreshToken: 'refresh-1-'.padEnd(30, 'x'),
  refreshTokenExpiresAt: '2026-04-29T10:00:00.000Z',
  ...overrides,
});

function setup(refresh: jest.Mock) {
  const storage = createMemoryTokenStorage();
  const client = { auth: { refresh } } as unknown as ApiClient;
  const session = new AuthSession(storage, () => client, () => NOW);
  return { session, storage };
}

describe('AuthSession', () => {
  it('persists tokens and restores them on the next launch', async () => {
    const { session, storage } = setup(jest.fn());
    await session.setTokens(tokens());

    const next = new AuthSession(storage, () => ({}) as ApiClient, () => NOW);
    expect(await next.restore()).toEqual(tokens());
    expect(await next.getAccessToken()).toBe('access-1');
  });

  it('refreshes proactively when the access token is about to expire, and stores the rotated pair', async () => {
    const rotated = tokens({ accessToken: 'access-2', refreshToken: 'refresh-2-'.padEnd(30, 'x') });
    const refresh = jest.fn().mockResolvedValue(rotated);
    const { session, storage } = setup(refresh);
    await session.setTokens(tokens({ accessTokenExpiresAt: '2026-03-30T10:00:10.000Z' }));

    expect(await session.getAccessToken()).toBe('access-2');
    expect(refresh).toHaveBeenCalledWith('refresh-1-'.padEnd(30, 'x'));
    expect(await storage.load()).toEqual(rotated);
  });

  it('single-flights concurrent refreshes (a rotated token may only be used once)', async () => {
    const refresh = jest.fn().mockResolvedValue(tokens({ accessToken: 'access-2' }));
    const { session } = setup(refresh);
    await session.setTokens(tokens());

    const results = await Promise.all([session.refreshAccessToken(), session.refreshAccessToken(), session.refreshAccessToken()]);
    expect(results).toEqual(['access-2', 'access-2', 'access-2']);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('clears the session (and notifies) when the server rejects the refresh token', async () => {
    const refresh = jest.fn().mockRejectedValue(new ApiError('INVALID_REFRESH_TOKEN', 'No longer valid', 401));
    const { session, storage } = setup(refresh);
    const listener = jest.fn();
    await session.setTokens(tokens());
    session.subscribe(listener);

    expect(await session.refreshAccessToken()).toBeUndefined();
    expect(await storage.load()).toBeNull();
    expect(listener).toHaveBeenLastCalledWith(null);
  });

  it('keeps the session when the refresh fails because the network is down', async () => {
    const refresh = jest.fn().mockRejectedValue(new ApiError('NETWORK_ERROR', 'offline'));
    const { session, storage } = setup(refresh);
    await session.setTokens(tokens());

    await expect(session.refreshAccessToken()).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
    expect(await storage.load()).toEqual(tokens());
  });

  it('has no access token once cleared', async () => {
    const { session } = setup(jest.fn());
    await session.setTokens(tokens());
    await session.clear();
    expect(await session.getAccessToken()).toBeUndefined();
    expect(session.getRefreshToken()).toBeUndefined();
  });
});
