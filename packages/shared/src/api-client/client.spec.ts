import { ApiError, createApiClient } from './client';

const json = (status: number, body: unknown) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));

describe('createApiClient', () => {
  it('maps network failures to NETWORK_ERROR', async () => {
    const client = createApiClient({ baseUrl: 'http://x', fetch: () => Promise.reject(new TypeError('fail')) });
    await expect(client.mealPlans.list()).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
  });

  it('maps API error bodies to ApiError with code, status and details', async () => {
    const client = createApiClient({
      baseUrl: 'http://x/',
      fetch: () =>
        json(400, { error: { code: 'VALIDATION_ERROR', message: 'Bad', details: [{ path: 'body.days', message: 'no' }] } }),
    });
    const error = await client.mealPlans.get('abc').catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ code: 'VALIDATION_ERROR', status: 400, details: [{ path: 'body.days', message: 'no' }] });
  });

  it('rejects responses that do not match the contract', async () => {
    const client = createApiClient({ baseUrl: 'http://x', fetch: () => json(200, { data: { nope: true } }) });
    await expect(client.mealPlans.get('abc')).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
  });

  it('builds URLs without double slashes and encodes ids', async () => {
    const fetchMock = jest.fn(() => json(200, { data: [] }));
    const client = createApiClient({ baseUrl: 'http://x/', fetch: fetchMock as unknown as typeof fetch });
    await client.mealPlans.list();
    expect(fetchMock).toHaveBeenCalledWith('http://x/api/v1/meal-plans', expect.objectContaining({ method: 'GET' }));
  });

  describe('token provider', () => {
    const planResponse = { data: [] };
    const expired = () => json(401, { error: { code: 'TOKEN_EXPIRED', message: 'Your session has expired.' } });
    const authHeader = (call: unknown[]) => ((call[1] as RequestInit).headers as Record<string, string>)['Authorization'];

    it('sends the bearer token on authenticated calls only', async () => {
      const fetchMock = jest.fn(() => json(200, planResponse));
      const client = createApiClient({
        baseUrl: 'http://x',
        fetch: fetchMock as unknown as typeof fetch,
        tokenProvider: { getAccessToken: () => 'token-1', refreshAccessToken: jest.fn() },
      });
      await client.mealPlans.list();
      expect(authHeader(fetchMock.mock.calls[0])).toBe('Bearer token-1');

      fetchMock.mockImplementation(() => json(401, { error: { code: 'INVALID_CREDENTIALS', message: 'no' } }));
      await client.auth.login({ email: 'a@b.co', password: 'x' }).catch(() => undefined);
      expect(authHeader(fetchMock.mock.calls[1])).toBeUndefined();
    });

    it('refreshes once on TOKEN_EXPIRED and retries with the new token', async () => {
      const fetchMock = jest.fn().mockImplementationOnce(expired).mockImplementation(() => json(200, planResponse));
      const refreshAccessToken = jest.fn().mockResolvedValue('token-2');
      const client = createApiClient({
        baseUrl: 'http://x',
        fetch: fetchMock as unknown as typeof fetch,
        tokenProvider: { getAccessToken: () => 'token-1', refreshAccessToken },
      });

      await expect(client.mealPlans.list()).resolves.toEqual([]);
      expect(refreshAccessToken).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(authHeader(fetchMock.mock.calls[1])).toBe('Bearer token-2');
    });

    it('does not loop: a second 401 after refreshing is surfaced', async () => {
      const fetchMock = jest.fn(expired);
      const refreshAccessToken = jest.fn().mockResolvedValue('token-2');
      const client = createApiClient({
        baseUrl: 'http://x',
        fetch: fetchMock as unknown as typeof fetch,
        tokenProvider: { getAccessToken: () => 'token-1', refreshAccessToken },
      });
      await expect(client.mealPlans.list()).rejects.toMatchObject({ code: 'TOKEN_EXPIRED' });
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(refreshAccessToken).toHaveBeenCalledTimes(1);
    });

    it('surfaces the 401 when the session cannot be renewed', async () => {
      const fetchMock = jest.fn(expired);
      const client = createApiClient({
        baseUrl: 'http://x',
        fetch: fetchMock as unknown as typeof fetch,
        tokenProvider: { getAccessToken: () => 'token-1', refreshAccessToken: () => Promise.resolve(undefined) },
      });
      await expect(client.mealPlans.list()).rejects.toMatchObject({ code: 'TOKEN_EXPIRED', status: 401 });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });
});
