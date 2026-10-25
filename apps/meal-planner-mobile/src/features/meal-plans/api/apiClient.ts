import { ApiError, createApiClient, type ApiClient } from '@ai-meal-planner/shared';

import { getApiBaseUrl } from '@/config/api';

let client: ApiClient | undefined;

/** Created lazily so a missing configuration surfaces as a normal, retryable error in the UI. */
export function getApiClient(): ApiClient {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    throw new ApiError('NETWORK_ERROR', 'The meal planner service address is not configured for this build.');
  }
  client ??= createApiClient({ baseUrl });
  return client;
}
