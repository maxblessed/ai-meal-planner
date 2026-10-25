# Meal planner API

> **Development-only.** These endpoints have **no authentication or ownership checks**: anyone who can reach
> the API can read every plan. Do not expose them as a production user-facing API until auth and per-user
> ownership are implemented. In `NODE_ENV=production` the API refuses to start unless
> `ALLOW_UNAUTHENTICATED_API=true` is set, as a guard against deploying it by accident.

Express 5 + TypeScript + Mongoose, one modular app (`apps/meal-planner-api`). Request/response contracts
(Zod schemas and types) live in `packages/shared` and are used by both the API and the mobile app.

## Endpoints (`/api/v1`)

| Method | Path | Description |
| --- | --- | --- |
| POST | `/meal-plans` | Create a plan from user constraints. `201` |
| GET | `/meal-plans` | List plans, newest first (max 20). |
| GET | `/meal-plans/:id` | One plan. `404` if unknown. |
| POST | `/meal-plans/:id/meals/:mealId/replace` | Replace one meal with a different one. The meal keeps its id. Returns the whole plan. |
| GET | `/health` | Liveness check (not versioned). |

Success: `{ "data": … }`. Errors: `{ "error": { "code", "message", "details?" } }` with codes
`VALIDATION_ERROR` (400, `details` lists `body.field` / `params.field` paths), `NOT_FOUND` (404),
`UNSATISFIABLE_PREFERENCES` (422), `NO_ALTERNATIVE_MEAL` (422), `SERVICE_UNAVAILABLE` (503), `INTERNAL_ERROR` (500).

## Structure
```
src/
  app.ts, container.ts      app factory (no I/O) and composition root
  main.ts, lambda.ts        local server / AWS Lambda handler
  config/env.ts             typed env parsing, production guard
  infrastructure/           database (lazy, cached Mongo connection), http (errors, validation), logging
  modules/meal-plans/       routes → controller → service → repository (+ model, schemas, generators)
```
Controllers only translate HTTP; business rules live in `MealPlanService`. Persistence sits behind
`MealPlanRepository` (Mongo and in-memory implementations).

## Generator
`MealPlanGenerator` is the seam for AI. Today `SampleMealGenerator` deterministically picks from ~20
hand-written recipes, and plans are stamped `generation.source = "development-sample"`: they are never
presented as AI output. It filters by dietary preference, allergies (with aliases such as dairy → milk,
gluten → wheat) and disliked ingredients, and returns `422 UNSATISFIABLE_PREFERENCES` rather than ignoring a
constraint it can't meet. Meals carry no `estimatedCost`; no prices are invented.
To add AI: implement `MealPlanGenerator`, set `source: 'ai'`, and swap it in `container.ts`.

## Running locally
```sh
# No MongoDB needed (in-memory, development only):
USE_IN_MEMORY_REPOSITORY=true npx nx serve @ai-meal-planner/meal-planner-api     # http://localhost:3000

# With MongoDB Atlas: put the variables in apps/meal-planner-api/.env.local (git-ignored; Nx loads it
# for `nx serve`) or export them in your shell:
#   MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>/…   # your own credentials
#   MONGODB_DB_NAME=meal_planner                               # required
npx nx serve @ai-meal-planner/meal-planner-api
```
`MONGODB_DB_NAME` is mandatory so plans can never land in whichever database the URI happens to name
(on a shared cluster that may belong to another application). Only `dist/main.js` / Lambda ignore `.env*`
files: there, set real environment variables.
Without `MONGODB_URI` (and without the in-memory flag) the API starts, `/health` works, and meal plan
endpoints return `503 SERVICE_UNAVAILABLE`. There is no fallback to any other database.
The mobile app reads `EXPO_PUBLIC_API_BASE_URL` (see `apps/meal-planner-mobile/.env.example`); development builds
default to `http://localhost:3000`, release builds must set it.

## Environment variables
See `apps/meal-planner-api/.env.example`: `MONGODB_URI`, `MONGODB_DB_NAME`, `USE_IN_MEMORY_REPOSITORY`,
`CORS_ALLOWED_ORIGINS`, `NODE_ENV`, `ALLOW_UNAUTHENTICATED_API`, `LOG_LEVEL`, `PORT`, `HOST`. Other variables in a
local env file (AWS, SES, Stripe, JWT) are not read by the API yet.

## AWS Lambda (intended approach: not deployed, nothing provisioned)
- `npx nx build @ai-meal-planner/meal-planner-api` bundles `dist/lambda.js` (export `handler`) and `dist/main.js`
  with esbuild; third-party code is bundled, so the artefact is a single file (zip `lambda.js`).
- One Lambda behind an API Gateway HTTP API (payload v2) with a `$default` route proxying to the handler
  (`serverless-http`). Runtime Node.js 22, handler `lambda.handler`.
- Set environment variables in the function configuration; keep `MONGODB_URI` in AWS Secrets Manager / SSM
  Parameter Store, not in source control or the template.
- The Mongo connection is opened lazily on the first request and reused while the container is warm; a failed
  attempt isn't cached.
- MongoDB Atlas network access must allow the Lambda's egress (NAT Elastic IP or PrivateLink/peering).
- Infrastructure-as-code will live in `infrastructure/aws/` when it is added.
- **Before any public deployment:** authentication, per-user ownership checks on every plan endpoint, rate
  limiting, and an API Gateway authorizer.
