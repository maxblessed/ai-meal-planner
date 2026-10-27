import { ApiError, createApiClient, type ApiClient } from '@ai-meal-planner/shared';

import { getApiBaseUrl } from '@/config/api';
import { AuthSession } from '../session/authSession';
import { defaultTokenStorage } from '../session/tokenStorage';

let client: ApiClient | undefined;

/** The one app-wide session: tokens live here, never in screen state. */
export const authSession = new AuthSession(defaultTokenStorage, () => getApiClient());

/** Created lazily so a missing configuration surfaces as a normal, retryable error in the UI. */
export function getApiClient(): ApiClient {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    throw new ApiError('NETWORK_ERROR', 'The meal planner service address is not configured for this build.');
  }
  client ??= createApiClient({ baseUrl, tokenProvider: authSession });
  return client;
}
