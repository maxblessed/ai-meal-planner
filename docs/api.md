# Meal planner API

> **Not deployed, and not ready to be exposed publicly.** Authentication and per-user ownership are implemented
> (see [Authentication](#authentication)), but the API is still intended for local development only. Work through
> the [pre-deployment checklist](#before-any-public-deployment) first.

Express 5 + TypeScript + Mongoose, one modular app (`apps/meal-planner-api`). Request/response contracts
(Zod schemas and types) live in `packages/shared` and are used by both the API and the mobile app.

## Endpoints (`/api/v1`)

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | `/auth/register` | – | Create an account; returns `{ user, tokens }`. `201`, `409` if the email exists. |
| POST | `/auth/login` | – | Returns `{ user, tokens }`. `401 INVALID_CREDENTIALS` (identical for wrong password and unknown email). |
| POST | `/auth/refresh` | – | Body `{ refreshToken }`; rotates and returns new `tokens`. |
| POST | `/auth/logout` | – | Body `{ refreshToken }`; ends that session immediately. Idempotent. |
| GET | `/auth/me` | Bearer | The current user. |
| POST | `/meal-plans` | Bearer | Create a plan for the caller. `201` |
| GET | `/meal-plans` | Bearer | The caller's plans, newest first (max 20). |
| GET | `/meal-plans/:id` | Bearer | One of the caller's plans. `404` if unknown **or owned by someone else**. |
| POST | `/meal-plans/:id/meals/:mealId/replace` | Bearer | Replace one meal. The meal keeps its id. Returns the whole plan. |
| GET | `/health` | – | Liveness check (not versioned). |

Success: `{ "data": … }`. Errors: `{ "error": { "code", "message", "details?" } }` with codes
`VALIDATION_ERROR` (400, `details` lists `body.field` / `params.field` paths), `UNAUTHENTICATED` / `TOKEN_EXPIRED` /
`INVALID_CREDENTIALS` / `INVALID_REFRESH_TOKEN` (401), `NOT_FOUND` (404), `EMAIL_ALREADY_REGISTERED` (409), `TOO_MANY_REQUESTS` (429),
`UNSATISFIABLE_PREFERENCES` (422), `NO_ALTERNATIVE_MEAL` (422), `SERVICE_UNAVAILABLE` (503), `INTERNAL_ERROR` (500).

## Authentication
- **Passwords:** scrypt (Node `crypto`, N=2^17, r=8, p=1, random 16-byte salt), compared in constant time. Parameters are stored with
  each hash, so they can be raised later. Unknown emails still pay the hashing cost so timing doesn't reveal accounts.
  Passwords are 8-128 characters (length rules only). Plain passwords are never logged or echoed in errors.
- **Access token:** HS256 JWT, 15 minutes (`ACCESS_TOKEN_MINUTES`), signed with `JWT_SECRET`; claims `sub` (user id) and `sid`
  (session id), fixed issuer/audience, algorithm pinned. Every request also checks that the session is still active, so
  logout is immediate rather than waiting for expiry.
- **Refresh token:** 48 random bytes, 30 days (`REFRESH_TOKEN_DAYS`), stored only as a SHA-256 hash. **Rotated on every use**; presenting
  a token that was already used revokes the whole session (theft detection). MongoDB removes expired tokens via a TTL index.
- **Ownership:** every meal plan stores `ownerId` (never returned). All repository reads and writes filter by owner, and another
  user's plan returns `404`, identical to a plan that doesn't exist.
- **Rate limiting:** login/register/refresh are limited per IP (20 / 15 min) **per server instance**: best effort only, not a
  substitute for API Gateway throttling or a WAF.
- Collections in `MONGODB_DB_NAME`: `users` (unique `email`), `refresh_tokens`, `meal_plans` (index `ownerId`).

## Structure
```
src/
  app.ts, container.ts      app factory (no I/O) and composition root
  main.ts, lambda.ts        local server / AWS Lambda handler
  config/env.ts             typed env parsing, production guard
  infrastructure/           database (lazy, cached Mongo connection), http (errors, validation), logging
  modules/auth/             register/login/refresh/logout/me, password hashing, JWT, auth middleware, repositories
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
`CORS_ALLOWED_ORIGINS`, `NODE_ENV`, `JWT_SECRET` (required, >= 32 chars), `ACCESS_TOKEN_MINUTES`, `REFRESH_TOKEN_DAYS`,
`AUTH_RATE_LIMIT`, `LOG_LEVEL`, `PORT`, `HOST`. Other variables in a local env file (AWS, SES, Stripe) are not read by the API yet.
Define each variable once: with a duplicate key, one value silently wins. Browsers enforce CORS; native apps are unaffected. Outside production any `localhost`/`127.0.0.1` port is allowed in
addition to `CORS_ALLOWED_ORIGINS`; production allows only the listed origins.

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

## Before any public deployment
Authentication exists, but these are still open:
- Security review and penetration test of the auth flows; decide on email verification and password reset (SES is not wired up yet).
- Edge rate limiting (API Gateway throttling / WAF); the in-app limiter is per instance.
- Keep `JWT_SECRET` in Secrets Manager/SSM and rotate it periodically. Rotation only invalidates outstanding access tokens (refresh tokens
  live in the database), and the app recovers by refreshing, so it is low-impact. Also restrict CORS to real origins and use a MongoDB
  user limited to the API's own database.
- Account deletion/export, audit logging of sign-ins, and monitoring for refresh-token reuse events.
- A load/memory check: scrypt at N=2^17 needs ~128 MiB per hash; size Lambda memory accordingly (>= 512 MB) and cap concurrency.
