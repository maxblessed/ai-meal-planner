/**
 * API base URL, configured per environment with EXPO_PUBLIC_API_BASE_URL
 * (see apps/meal-planner-mobile/.env.example). Development builds fall back to
 * the local API; release builds must set it explicitly.
 */
export function getApiBaseUrl(): string | undefined {
  const configured = process.env.EXPO_PUBLIC_API_BASE_URL;
  if (configured) return configured;
  return __DEV__ ? 'http://localhost:3000' : undefined;
}
