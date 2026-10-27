# Requirements (mobile foundation)

- Markets: Ireland (IE/EUR) and United Kingdom (GB/GBP), extensible to the US via `config/countries.ts`.
- Users: individuals and families planning meals around a budget.
- Implemented: onboarding (country, household size, dietary preferences, allergies, disliked ingredients, weekly budget), local persistence, preference editing, home screen, tab navigation.
- Implemented: Express/Mongoose API foundation (Lambda-ready) and meal planning: generate a 7-day sample plan, list/get plans, view meal details, replace a meal. Plans respect diet, allergies and dislikes or fail with a clear error.
- Constraints: sample meals come from a built-in development set and are labelled as such; there is no verified pricing, and `estimatedCost` is optional and always flagged as an estimate.
- Implemented: accounts (register, login, logout, current user), scrypt password hashing, short-lived access tokens with rotating refresh tokens, secure token storage on mobile, and per-user ownership of meal plans (users can only read or change their own).
- Planned (not started): email verification/password reset, AI generation, shopping lists, grocery pricing/savings, subscriptions, admin, deployment.
