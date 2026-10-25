# Architecture

## Workspace
Nx workspace (npm). Currently one app, `apps/meal-planner-mobile` (Expo SDK 56, React Native, Expo Router), plus its Playwright e2e project. API, admin and shared packages from the long-term layout are **not created yet**; add them when there is a real boundary (e.g. shared API contracts once the API exists).

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
  meal-plans/ shopping-lists/ savings/   Placeholder screens (no backend yet)
components/ui|layout Reusable, feature-agnostic components
theme/               Colours, spacing, radii, typography, shadows
config/countries.ts  Supported countries → currency/locale/measurement
```
Imports use the `@/` alias for `src/` (tsconfig `paths` + jest `moduleNameMapper`).

## Key decisions
- **Country config is the single source of truth.** `CountryCode` and `CurrencyCode` are derived from `COUNTRIES`. The stored profile holds only `countryCode`; currency is derived, so they can never disagree. Adding the US = one new entry.
- **One model for onboarding, display and editing.** `userPreferencesSchema` (persisted) and `preferencesFormSchema` (same, but budget is the typed string) live in `features/preferences`. Allergies, dietary preferences and disliked ingredients are separate fields.
- **Onboarding gate via `Stack.Protected`**, driven by whether a valid profile exists, so deep links and refreshes can't bypass or revisit onboarding incorrectly.
- **Local persistence:** AsyncStorage, versioned envelope (`{version: 1, preferences}`). Unreadable/invalid data is treated as "not onboarded".
- **No global state library or React Query yet.** A small context holds the profile. React Query arrives with the first real API call.
