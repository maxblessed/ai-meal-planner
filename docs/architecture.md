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
  _layout.tsx        Providers + root Stack. Stack.Protected gates onboarding vs. main app
  onboarding.tsx     First-run wizard (only reachable while not onboarded)
  preferences.tsx    Edit preferences (only reachable once onboarded)
  (tabs)/            Home, Meal Plan, Shopping List, Savings
features/
  preferences/       Profile model (zod), storage (AsyncStorage), provider + hooks
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
- **Onboarding gate via `Stack.Protected`**, driven by whether a valid profile exists, so deep links and refreshes can't bypass or revisit onboarding incorrectly.
- **Local persistence:** AsyncStorage, versioned envelope (`{version: 1, preferences}`). Unreadable/invalid data is treated as "not onboarded".
- **Server state uses TanStack React Query; no global state library.** A small context holds the local profile. The API is called through `createApiClient` from `@ai-meal-planner/shared`, which validates every response against the shared Zod schemas.
- **Contracts are shared, not duplicated.** `packages/shared` owns country config, dietary preferences and meal-plan request/response schemas. The currency on a plan is derived server-side from the country.
- **Generation sits behind `MealPlanGenerator`.** The development sample generator is labelled `development-sample`; swapping in AI changes one line in the API's composition root, not the contract or the UI.
