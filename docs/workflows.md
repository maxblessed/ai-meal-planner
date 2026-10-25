# Workflows

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
AI generation, shopping lists, price comparison/savings (placeholder screens), authentication.
