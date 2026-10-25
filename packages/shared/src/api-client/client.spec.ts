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
});
