# RS UI

RS UI is a Laravel + Inertia + React application for browsing partners, collections, and file-system-like paths backed by an external API.

## Tech stack

- Laravel (PHP)
- Inertia.js + React + TypeScript
- Vite
- Tailwind CSS + Radix UI primitives
- Pest (PHP tests)

## Prerequisites

- PHP 8.5+
- Composer
- Node.js 20+
- npm

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

## Environment configuration

Configure your external API endpoint in `.env` and ensure the related `services.rs.v1.endpoint` config resolves correctly. The application depends on an authenticated external session cookie (`external_auth_cookie`) and expiry timestamp (`external_auth_expires`) for API-backed actions.

## Common commands

```bash
# Frontend
ddev npm run dev
ddev npm run build
ddev npm run types
ddev npm run lint
ddev npm run format

# Backend/tests
ddev php artisan test
./vendor/bin/pest
vendor/bin/pint --dirty
```

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

- Testing plan and current coverage: `docs/testing-plan.md`
