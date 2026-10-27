# Workflows

## Sign up / sign in
1. Signed-out users see **Sign in** (and can switch to **Create account**). Every other route redirects there.
2. Registering (email + password of 8+ characters, optional name) signs the user in. Signing in with wrong credentials shows one generic message; an already-registered email is reported on the email field.
3. A signed-in user without saved preferences goes to onboarding; otherwise to Home.
4. **Sign out** (Home → Account) ends the session on the server, clears tokens from the device, and clears cached plans. Signing in as a different person on the same device shows none of the previous user's data.
5. Sessions are renewed automatically in the background. If renewal is rejected the user is returned to Sign in. On the web a page reload signs the user out (tokens are memory-only there).

## Onboarding (first run)
1. **Country** – Ireland (EUR) or United Kingdom (GBP); currency is derived.
2. **Household** – 1–12 people (default 1).
3. **Food preferences** – optional dietary preferences; allergies (strict exclusions) and disliked ingredients are separate lists.
4. **Weekly budget** – positive amount (max 2 decimals) for the whole household, shown in the country's currency.
5. **Review** – summary with per-section Edit; *Finish setup* saves locally and the app switches to the Home tab.

## Editing preferences
Home → options icon → `/preferences` opens the same wizard on the review step. Edit any section, then *Save changes* (or close to cancel).

## Meal plan
1. **Meal Plan tab, no plan yet** → empty state with *Generate a 7-day sample plan*. The app sends the saved preferences (country, household, diet, allergies, dislikes, budget) to `POST /api/v1/meal-plans`.
2. **Weekly plan** → days grouped with breakfast/lunch/dinner cards (time, servings, ingredient preview). A notice states the plan comes from a development sample set, not AI.
3. **Meal detail** → ingredients with quantities for the household, method, *Replace this meal* (same meal slot, different recipe that still fits the constraints) and *Back to weekly plan*.
4. **Failures** → loading, load-error (with *Try again*) and generate/replace errors show the API's message; an unreachable API is reported as such, never faked. If the sample set can't satisfy a diet/allergy combination the user sees that, rather than a plan that ignores it.
5. **Home** shows the current plan's date range and meal count once one exists.

## Not implemented yet
AI generation, shopping lists, price comparison/savings (placeholder screens), email verification and password reset.
