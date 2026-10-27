import type { z } from 'zod';

import {
  apiErrorResponseSchema,
  type ApiErrorCode,
  type ValidationIssue,
} from '../contracts/errors';
import {
  authSessionResponseSchema,
  currentUserResponseSchema,
  logoutResponseSchema,
  refreshResponseSchema,
  type AuthSession,
  type AuthTokens,
  type LoginRequest,
  type RegisterRequest,
  type User,
} from '../contracts/auth';
import {
  mealPlanListResponseSchema,
  mealPlanResponseSchema,
  type CreateMealPlanRequest,
  type MealPlan,
} from '../contracts/meal-plans';

export type ApiClientErrorCode = ApiErrorCode | 'NETWORK_ERROR' | 'INVALID_RESPONSE';

export class ApiError extends Error {
  constructor(
    readonly code: ApiClientErrorCode,
    message: string,
    readonly status?: number,
    readonly details?: ValidationIssue[],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Supplies credentials to the client. The client never stores tokens itself:
 * the app owns persistence, refresh single-flighting and sign-out.
 */
export type TokenProvider = {
  getAccessToken(): string | undefined | Promise<string | undefined>;
  /** Obtains a fresh access token (e.g. via the refresh token). Resolves undefined if the session is gone. */
  refreshAccessToken(): Promise<string | undefined>;
};

export type ApiClientOptions = {
  baseUrl: string;
  fetch?: typeof fetch;
  timeoutMs?: number;
  tokenProvider?: TokenProvider;
};

export function createApiClient({
  baseUrl,
  fetch: fetchImpl = globalThis.fetch,
  timeoutMs = 15000,
  tokenProvider,
}: ApiClientOptions) {
  const root = baseUrl.replace(/\/+$/, '');

  type RequestOptions = { body?: unknown; authenticated?: boolean };

  async function send<S extends z.ZodTypeAny>(
    method: 'GET' | 'POST',
    path: string,
    schema: S,
    { body, authenticated = false }: RequestOptions,
    accessToken: string | undefined,
  ): Promise<{ ok: true; data: z.infer<S> } | { ok: false; error: ApiError }> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let response: Response;
    try {
      response = await fetchImpl(`${root}${path}`, {
        method,
        headers: {
          Accept: 'application/json',
          ...(body !== undefined && { 'Content-Type': 'application/json' }),
          ...(authenticated && accessToken && { Authorization: `Bearer ${accessToken}` }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });
    } catch {
      throw new ApiError('NETWORK_ERROR', "We couldn't reach the meal planner service. Check your connection and try again.");
    } finally {
      clearTimeout(timer);
    }

    const payload: unknown = await response.json().catch(() => undefined);

    if (!response.ok) {
      const parsed = apiErrorResponseSchema.safeParse(payload);
      if (parsed.success) {
        const { code, message, details } = parsed.data.error;
        return { ok: false, error: new ApiError(code, message, response.status, details) };
      }
      return {
        ok: false,
        error: new ApiError('INTERNAL_ERROR', `The service returned an unexpected error (${response.status}).`, response.status),
      };
    }

    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      throw new ApiError('INVALID_RESPONSE', 'The service returned data this app version cannot read.', response.status);
    }
    return { ok: true, data: parsed.data };
  }

  async function request<S extends z.ZodTypeAny>(
    method: 'GET' | 'POST',
    path: string,
    schema: S,
    options: RequestOptions = {},
  ): Promise<z.infer<S>> {
    const accessToken = options.authenticated ? await tokenProvider?.getAccessToken() : undefined;
    let result = await send(method, path, schema, options, accessToken);

    // An expired/missing access token gets exactly one refresh-and-retry.
    if (
      !result.ok &&
      options.authenticated &&
      tokenProvider &&
      result.error.status === 401 &&
      (result.error.code === 'TOKEN_EXPIRED' || result.error.code === 'UNAUTHENTICATED')
    ) {
      const fresh = await tokenProvider.refreshAccessToken();
      if (fresh) result = await send(method, path, schema, options, fresh);
    }

    if (!result.ok) throw result.error;
    return result.data;
  }

  const encode = encodeURIComponent;

  return {
    auth: {
      async register(input: RegisterRequest): Promise<AuthSession> {
        return (await request('POST', '/api/v1/auth/register', authSessionResponseSchema, { body: input })).data;
      },
      async login(input: LoginRequest): Promise<AuthSession> {
        return (await request('POST', '/api/v1/auth/login', authSessionResponseSchema, { body: input })).data;
      },
      /** Rotates the refresh token: the previous one stops working. */
      async refresh(refreshToken: string): Promise<AuthTokens> {
        return (await request('POST', '/api/v1/auth/refresh', refreshResponseSchema, { body: { refreshToken } })).data.tokens;
      },
      async logout(refreshToken: string): Promise<void> {
        await request('POST', '/api/v1/auth/logout', logoutResponseSchema, { body: { refreshToken } });
      },
      async me(): Promise<User> {
        return (await request('GET', '/api/v1/auth/me', currentUserResponseSchema, { authenticated: true })).data.user;
      },
    },
    mealPlans: {
      async create(input: CreateMealPlanRequest): Promise<MealPlan> {
        return (await request('POST', '/api/v1/meal-plans', mealPlanResponseSchema, { body: input, authenticated: true })).data;
      },
      /** Newest first. */
      async list(): Promise<MealPlan[]> {
        return (await request('GET', '/api/v1/meal-plans', mealPlanListResponseSchema, { authenticated: true })).data;
      },
      async get(id: string): Promise<MealPlan> {
        return (await request('GET', `/api/v1/meal-plans/${encode(id)}`, mealPlanResponseSchema, { authenticated: true })).data;
      },
      /** Returns the whole updated plan; the replaced meal keeps its id. */
      async replaceMeal(planId: string, mealId: string): Promise<MealPlan> {
        return (
          await request('POST', `/api/v1/meal-plans/${encode(planId)}/meals/${encode(mealId)}/replace`, mealPlanResponseSchema, { body: {}, authenticated: true })
        ).data;
      },
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
