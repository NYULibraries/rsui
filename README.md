# RS UI

RS UI is a Laravel + Inertia + React application for browsing partners, collections, and file-system-like paths backed by an external API.

## Tech stack

- Laravel (PHP)
- Inertia.js + React + TypeScript
- Vite
- Tailwind CSS + Radix UI primitives
- Pest (PHP tests)

## Prerequisites

- PHP 8.2+ (the `ddev` environment provisions PHP 8.4)
- Composer
- Node.js 20+
- npm
- [ddev](https://ddev.readthedocs.io/) — **required**: all commands in this README and in
  CI are run through `ddev`, not directly against a host PHP/Node install.

## Quick start

```bash
ddev composer install
ddev npm install
cp .env.example .env
ddev php artisan key:generate
ddev php artisan migrate
ddev npm run dev
```

In a second terminal, run:

```bash
php artisan serve
```

## Architecture overview

RS UI is a **proxy/UI layer**, not a system of record: it holds almost no domain data
of its own. Partners, collections, files, and search results all live in an external
API ("RSBE"), and RS UI's job is to authenticate against it, shape its responses into
typed Inertia props, and render them with React.

- **Laravel** owns routing, session/auth middleware, request validation, and the HTTP
  boundary to RSBE (`app/Services/ExternalApiService.php`,
  `app/Services/ExternalApiClient.php`, `app/Services/ExternalFileDownloader.php`).
- **Inertia.js** lets controllers return React page components directly
  (`Inertia::render(...)`), so there is no separate first-party JSON API/SPA pair to
  maintain for page navigation (see `docs/adr/0002-inertia-over-separate-spa.md`).
- **React + TypeScript** renders the pages/components in `resources/js/`. A handful of
  in-page interactions (search, previews, workflow submission) call small JSON
  endpoints via the shared `apiFetch`/`apiFetchText` helpers in `resources/js/lib/api.ts`.
- The local `users` table exists only so Laravel's `Auth` facade has something to
  authenticate against once RSBE confirms a login — it is not an independent identity
  store (see `docs/adr/0001-external-auth-over-laravel-auth.md`).
- File browsing/preview/download routes proxy RSBE rather than exposing it directly to
  the browser (see `docs/adr/0003-proxy-file-system-through-laravel.md`).

See `docs/adr/` for the full set of architecture decision records and
`docs/api-contract.md` for every external endpoint RS UI depends on.

## Environment configuration

Copy `.env.example` to `.env` (done automatically by `composer create-project`, or run
`cp .env.example .env` yourself) and set at minimum:

| Variable | Purpose |
| --- | --- |
| `RS_V1_ENDPOINT` | Base URL of the external RS API (RSBE), e.g. `https://rsbe.example.edu/api/v0/`. Resolved via `config('services.rs.v1.endpoint')`. All external requests in `app/Services/` are built against this. |
| `APP_URL` | Base URL RS UI is served from; used for absolute links and asset generation. |
| `APP_ENV` | `local`/`production`/etc. Set to `e2e` only when running the E2E suite (`scripts/e2e.sh` handles this) — it loads `.env.e2e` instead of `.env` and must not be used outside that workflow. |
| `SESSION_DRIVER`, `SESSION_LIFETIME`, `SESSION_DOMAIN` | Standard Laravel session config. Note `external_auth_expires` (see below) independently bounds how long a user stays logged in, regardless of `SESSION_LIFETIME`. |

RS UI additionally depends on two **session** values (not `.env` values) written by
`ExternalAuthController::login()` after a successful RSBE login:

- `external_auth_cookie` — the RSBE `Authorization` cookie value, forwarded on every
  authenticated request to RSBE.
- `external_auth_expires` — a Unix timestamp from that cookie's `Expires` attribute;
  once it has passed, `CheckExternalAuthExpiration` logs the user out of the local
  Laravel session too.

See `docs/api-contract.md` for the full external API contract these values interact
with.

## Common commands

```bash
# Frontend dev/build
ddev npm run dev
ddev npm run build
ddev npm run types
ddev npm run lint
ddev npm run format
```

See **Testing** and **Static analysis** below for backend/quality commands.

## Static analysis

PHPStan (via Larastan) runs at level 5 over `app/`, configured in `phpstan.neon`. Run it
with `composer run analyse` (or `ddev exec "vendor/bin/phpstan analyse --memory-limit=512M"`).
The codebase currently passes at level 5 with zero errors; the level can be raised
incrementally as coverage matures.

## Testing

```bash
# PHP (Pest) — full suite
ddev php artisan test

# PHP — a single file
ddev php artisan test tests/Feature/ExternalApiServiceAuthCookieTest.php

# Formatting
vendor/bin/pint --dirty

# End-to-end (Playwright, against a hermetic mock RS API — see tests/e2e/README.md)
ddev npm run test:e2e
```

There is no JavaScript unit/component test runner installed yet (no Jest/React Testing
Library) — user-facing flows are covered by the Playwright E2E suite instead. See
`docs/testing-plan.md` for current coverage (PHP + E2E test counts and what each covers)
and remaining gaps, and `tests/e2e/README.md` for E2E infrastructure details.

## Deployment

`.github/workflows/build-release.yml` builds and publishes a release whenever a `v*` tag
is pushed (or via manual `workflow_dispatch`):

1. Installs PHP dependencies (`--no-dev`) and builds frontend assets (`pnpm run build`),
   verifying `public/build` exists.
2. Packages the app into `release.tar.gz` (excluding dev-only files) and attaches it to
   a GitHub Release — tags containing `alpha`/`beta`/`rc`/`dev`/`preview` are marked as
   prereleases.
3. Triggers a `deploy-dev` or `deploy-prod` job depending on the tag. These jobs are
   currently placeholders — fill in the actual deploy mechanism for your environment.

See `docs/RUNBOOK.md` for rollback steps and other operational procedures.

## Troubleshooting

- **Blank page / "Unable to locate file in Vite manifest" error** — run `ddev npm run
  build` (production) or make sure `ddev npm run dev` / `composer run dev` is running
  (development). See `docs/RUNBOOK.md` for the E2E-specific case (`public/hot`).
- **User unexpectedly logged out** — expected once `external_auth_expires` has passed;
  see `docs/RUNBOOK.md` for how to distinguish this from a cookie-selection regression.
- **502/503 or an external-API error page** — RSBE is unreachable or erroring; see
  `docs/RUNBOOK.md` → "The external API is down or returning errors" for diagnostic
  steps and log queries.
- **Where to look first** — `storage/logs/laravel.log`. Application code logs
  structured context (e.g. `partner_id`, `collection_id`, `workflow_id`, `status`)
  rather than free text, so `grep` on those keys to isolate an issue.

## Authentication

Core identity management workflows—including user registration, password resets, and email verification—are owned and managed externally by RSBE.

These features are intentionally absent from this application. All user onboarding, account recovery, and verification processes must be handled directly through the RSBE service.

## Authorization and path safety

RSUI delegates authorization, roles, and privileges to the external RS API. The API
enforces whether an authenticated user may access a partner, collection, path, or
workflow; RSUI intentionally does not duplicate those policies locally.

The `/fs`, `/preview`, and `/download` routes proxy the path formats defined by the
external API. Path traversal and normalization protections are enforced by that API
layer, so RSUI must preserve the upstream path contract rather than apply a separate
normalization scheme. RSUI is still responsible for authentication/session middleware,
request validation, and preserving its own routing-prefix transformations.

## Application flow overview

1. Authenticated users enter the dashboard and navigate partners/collections.
2. Collection browsing and file preview/download actions call external API-backed endpoints.
3. Search pages call `SearchController`, which delegates query execution and pagination to `ExternalApiService`.
4. React pages render via Inertia responses from Laravel controllers.

## Important routes

- `GET /dashboard` — partners index
- `GET /partners/{partner}` — partner details
- `GET /collections/{collection}` — collection details
- `GET /paths/{partner}/{collection}/{path?}` — path browsing
- `GET /preview/{path}` — file preview
- `GET /download/{path}` — file download stream
- `GET /search` — search page
- `GET /api/search` — API search endpoint
- `GET /api/search/autocomplete` — autocomplete endpoint

## Project structure

```text
app/
  Http/Controllers/   # Inertia/API controllers
  Services/           # External API integration layer
resources/js/
  components/         # UI and feature components
  pages/              # Inertia page components
  hooks/              # Shared React hooks
tests/                # Pest feature/unit tests
```

## Documentation index

- Architecture decision records: `docs/adr/`
- External API contract: `docs/api-contract.md`
- Operational runbook: `docs/RUNBOOK.md`
- Testing plan and current coverage: `docs/testing-plan.md`
- E2E test infrastructure: `tests/e2e/README.md`
- Production-readiness audit and remaining work: `docs/production-readiness-plan.md`
- Known gaps: `docs/TODO.md`
- Contributing guide: `CONTRIBUTING.md`
- Security policy: `SECURITY.md`
