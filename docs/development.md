# Development guide

Every command below is run **from the workspace root** (`ai-meal-planner/`) unless it says otherwise.

## Install

```sh
npm install
```

## Daily commands

| Command                  | What it does                                                                    | Terminal     |
| ------------------------ | ------------------------------------------------------------------------------- | ------------ |
| `npm run dev`            | Start the Expo mobile app (same as `dev:mobile`)                                | own terminal |
| `npm run dev:mobile`     | Expo dev server (QR code, press `i` / `a` / `w`)                                | own terminal |
| `npm run dev:api`        | Express API with reload on `http://localhost:3000`                              | own terminal |
| `npm run dev:api:memory` | API with in-memory storage (no MongoDB; data lost on restart)                   | own terminal |
| `npm run dev:all`        | API + Expo web dev server together, logs interleaved                            | one terminal |
| `npm run serve:web`      | Expo dev server with the web version                                            | own terminal |
| `npm run typecheck`      | TypeScript check for every project                                              | any          |
| `npm run lint`           | ESLint for every project                                                        | any          |
| `npm run test`           | Jest for every project                                                          | any          |
| `npm run check`          | typecheck + lint + test                                                         | any          |
| `npm run build`          | Bundle the API (`apps/meal-planner-api/dist`)                                   | any          |
| `npm run build:mobile`   | `expo export` of the mobile app (static bundle, no EAS account needed)          | any          |
| `npm run doctor`         | `nx report` + `expo install --check` (flags Expo-incompatible package versions) | any          |
| `npm run graph`          | Open the Nx project graph                                                       | any          |

`npm run build` covers only the API on purpose: the mobile project's Nx `build` target is `eas build`, which needs an Expo
account and uploads to EAS. Use `build:mobile` for a local export.

## Environment files

Both files are git-ignored. Copy the example, then fill in values yourself. Never commit them or paste them into chats.

```sh
cp apps/meal-planner-api/.env.example apps/meal-planner-api/.env
cp apps/meal-planner-mobile/.env.example apps/meal-planner-mobile/.env
```

- **API** (`apps/meal-planner-api/.env`): set `JWT_SECRET` (32+ characters) and either `MONGODB_URI` + `MONGODB_DB_NAME`
  or `USE_IN_MEMORY_REPOSITORY=true`. Generate a secret with
  `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`.
- **Mobile** (`apps/meal-planner-mobile/.env`): `EXPO_PUBLIC_API_BASE_URL` points at the API. It defaults to
  `http://localhost:3000` in development. Android emulators need `http://10.0.2.2:3000`; a physical phone needs your
  machine's LAN IP. `EXPO_PUBLIC_*` values are bundled into the app, so never put secrets in them.

## Running the app

### Mobile and API in separate terminals (recommended)

```sh
# terminal 1
npm run dev:api
# terminal 2
npm run dev:mobile
```

Separate terminals keep Expo's interactive keys (`i`, `a`, `w`, `r`) working.

### Both in one terminal

```sh
npm run dev:all
```

This runs the Nx `serve` target of both projects (API watcher and `expo start --web`). Expo's interactive keys are limited
when its output is shared, so use the separate-terminal setup if you need them.

### Opening the app

- **Expo Go (physical device):** run `npm run dev:mobile`, scan the QR code. Phone and computer must share a network, and
  `EXPO_PUBLIC_API_BASE_URL` must use the computer's LAN IP.
- **iOS simulator:** `npm run dev:mobile`, then press `i` (needs Xcode).
- **Android emulator:** `npm run dev:mobile`, then press `a` (needs Android Studio; API URL `http://10.0.2.2:3000`).
- **Browser:** `npm run serve:web` (or press `w` in `dev:mobile`). On web, sign-in tokens are memory-only, so a reload
  signs you out.

## Stopping servers

Press `Ctrl+C` in the terminal running the server. If a port stays busy afterwards, find the process with
`lsof -i :3000` (API) or `lsof -i :8081` (Expo) and stop it with `kill <pid>`.

## Troubleshooting

- **Stale Metro cache or odd bundling errors:** `npx nx start @ai-meal-planner/meal-planner-mobile -- --clear`.
- **API exits at startup:** a required variable is missing; check `JWT_SECRET` (32+ chars) and `MONGODB_DB_NAME`, or enable
  `USE_IN_MEMORY_REPOSITORY=true`. It is refused when `NODE_ENV=production`.
- **Browser shows a CORS error (Expo web):** the browser's origin is not allowed by the API. Expo web's port can change
  (8081, 8082, 19006, ...); check the address bar. Outside production the API already allows every `localhost` /
  `127.0.0.1` port, so after pulling this change just restart `npm run dev:api` (it does not hot-reload env or CORS
  changes reliably). If you open the web app by LAN IP or hostname, add that exact origin (scheme, host, port, no trailing
  slash) to `CORS_ALLOWED_ORIGINS` in `apps/meal-planner-api/.env.local`. Note the API reads `.env.local` over `.env`, and a
  stale list there (e.g. only `:4200`) was the usual cause. Native apps (Expo Go) are not subject to CORS.
- **Physical phone cannot reach the API:** `localhost` on the phone is the phone. Set `EXPO_PUBLIC_API_BASE_URL=http://<your
computer's LAN IP>:3000` in the mobile env file, restart Expo with `--clear`, and make sure the API `HOST` is reachable
  (not only `localhost`) and the firewall allows port 3000.
- **App cannot reach the API:** confirm `npm run dev:api` is running and check `EXPO_PUBLIC_API_BASE_URL` (see above).
  Restart Expo after changing `.env`.
- **Port already in use:** see "Stopping servers".
- **Stale Nx results:** `npx nx reset`.
- **Dependency drift:** `npm run doctor` lists packages that differ from what the installed Expo SDK expects. It may report
  drift that predates your changes; do not "fix" it with `--fix` without checking.
