import type { z } from 'zod';

import {
  apiErrorResponseSchema,
  type ApiErrorCode,
  type ValidationIssue,
} from '../contracts/errors';
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

export type ApiClientOptions = {
  baseUrl: string;
  fetch?: typeof fetch;
  timeoutMs?: number;
};

export function createApiClient({ baseUrl, fetch: fetchImpl = globalThis.fetch, timeoutMs = 15000 }: ApiClientOptions) {
  const root = baseUrl.replace(/\/+$/, '');

  async function request<S extends z.ZodTypeAny>(
    method: 'GET' | 'POST',
    path: string,
    schema: S,
    body?: unknown,
  ): Promise<z.infer<S>> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let response: Response;
    try {
      response = await fetchImpl(`${root}${path}`, {
        method,
        headers: { Accept: 'application/json', ...(body !== undefined && { 'Content-Type': 'application/json' }) },
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
        throw new ApiError(code, message, response.status, details);
      }
      throw new ApiError('INTERNAL_ERROR', `The service returned an unexpected error (${response.status}).`, response.status);
    }

    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      throw new ApiError('INVALID_RESPONSE', 'The service returned data this app version cannot read.', response.status);
    }
    return parsed.data;
  }

  const encode = encodeURIComponent;

  return {
    mealPlans: {
      async create(input: CreateMealPlanRequest): Promise<MealPlan> {
        return (await request('POST', '/api/v1/meal-plans', mealPlanResponseSchema, input)).data;
      },
      /** Newest first. */
      async list(): Promise<MealPlan[]> {
        return (await request('GET', '/api/v1/meal-plans', mealPlanListResponseSchema)).data;
      },
      async get(id: string): Promise<MealPlan> {
        return (await request('GET', `/api/v1/meal-plans/${encode(id)}`, mealPlanResponseSchema)).data;
      },
      /** Returns the whole updated plan; the replaced meal keeps its id. */
      async replaceMeal(planId: string, mealId: string): Promise<MealPlan> {
        return (
          await request('POST', `/api/v1/meal-plans/${encode(planId)}/meals/${encode(mealId)}/replace`, mealPlanResponseSchema, {})
        ).data;
      },
    },
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
