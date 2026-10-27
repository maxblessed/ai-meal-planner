# Architecture

## Workspace
Nx workspace (npm workspaces: `apps/*`, `packages/*`).

| Project | Purpose |
| --- | --- |
| `apps/meal-planner-mobile` | Expo SDK 56 / React Native / Expo Router app |
| `apps/meal-planner-api` | Express 5 API (Mongoose, Lambda-compatible) — see [api.md](api.md) |
| `packages/shared` | Zod contracts, country config and the typed API client, used by both apps |
| `apps/meal-planner-mobile-e2e` | Playwright e2e project |

`packages/shared` is consumed as TypeScript source (`exports` → `src/index.ts`), so there is no build step.
The admin app and `packages/mobile`/`packages/api` from the long-term layout are not created yet.

## Mobile app (`apps/meal-planner-mobile/src`)
```
app/                 Expo Router routes only; each file re-exports a feature screen
  _layout.tsx        Providers + root Stack. Stack.Protected gates three states: signed out, signed in but not onboarded, main app
  login.tsx register.tsx   Only reachable while signed out
  onboarding.tsx     First-run wizard (signed in, no preferences yet)
  preferences.tsx    Edit preferences (signed in and onboarded)
  (tabs)/            Home, Meal Plan, Shopping List, Savings
features/
  auth/              Login/register screens, AuthProvider, token session (secure storage), shared API client wiring
  preferences/       Profile model (zod), per-user storage (AsyncStorage), provider + hooks
  onboarding/        Multi-step wizard (react-hook-form), reused for editing
  home/              Home screen
  meal-plans/        Weekly plan, meal detail, replace-meal (React Query hooks over the shared API client)
  shopping-lists/ savings/   Placeholder screens (no backend yet)
components/ui|layout Reusable, feature-agnostic components
theme/               Colours, spacing, radii, typography, shadows
config/countries.ts  Re-exports the shared country config (single source of truth, also used by the API)
config/api.ts        API base URL (EXPO_PUBLIC_API_BASE_URL)
```
Imports use the `@/` alias for `src/` (tsconfig `paths` + jest `moduleNameMapper`).

## Key decisions
- **Country config is the single source of truth.** `CountryCode` and `CurrencyCode` are derived from `COUNTRIES`. The stored profile holds only `countryCode`; currency is derived, so they can never disagree. Adding the US = one new entry.
- **One model for onboarding, display and editing.** `userPreferencesSchema` (persisted) and `preferencesFormSchema` (same, but budget is the typed string) live in `features/preferences`. Allergies, dietary preferences and disliked ingredients are separate fields.
- **Navigation gates via `Stack.Protected`**, driven by auth state and whether the signed-in user has a profile, so deep links and refreshes can't reach screens meant for another state.
- **Local persistence:** preferences in AsyncStorage under a per-user key (`mealplanner.userPreferences.<userId>`), versioned envelope; unreadable data means "not onboarded". They aren't secret, but they belong to one account.
- **Tokens never touch AsyncStorage.** On iOS/Android they live in `expo-secure-store` (Keychain/Keystore, device-only). The web has no secure storage, so tokens are memory-only there and a reload signs the user out. `AuthSession` refreshes access tokens (single-flight, because a rotated refresh token is single-use), and the cache of server data is cleared on sign-out.
- **Auth lives in the API, not the client.** Ownership is enforced server-side on every query; the app only presents what the API returns.
- **Server state uses TanStack React Query; no global state library.** A small context holds the local profile. The API is called through `createApiClient` from `@ai-meal-planner/shared`, which validates every response against the shared Zod schemas.
- **Contracts are shared, not duplicated.** `packages/shared` owns country config, dietary preferences and meal-plan request/response schemas. The currency on a plan is derived server-side from the country.
- **Generation sits behind `MealPlanGenerator`.** The development sample generator is labelled `development-sample`; swapping in AI changes one line in the API's composition root, not the contract or the UI.
