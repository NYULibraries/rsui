# Runbook

Operational guide for diagnosing and recovering RS UI in production/staging. RS UI has
almost no domain data of its own — most incidents originate either in the external RSBE
API or in the session/cookie handshake with it.

## Reading the logs

Application logs are written to `storage/logs/laravel.log` (single-file channel by
default; see `LOG_CHANNEL`/`LOG_STACK` in `.env`).

```bash
ddev exec "tail -f storage/logs/laravel.log"
# or, once deployed without ddev:
tail -f storage/logs/laravel.log
```

Search for structured error context added throughout `app/Services` and
`app/Http/Controllers`, e.g.:

```bash
grep -i "external api" storage/logs/laravel.log | tail -50
grep -i "workflow submission" storage/logs/laravel.log | tail -50
```

Every log entry from the external-API integration includes contextual fields (e.g.
`partner_id`, `collection_id`, `workflow_id`, `status`) rather than free-text — filter on
those keys to isolate a specific resource or failure mode.

## The external API is down or returning errors

**Symptom:** Users see the branded error page for 502/503, or dashboard/collection pages
render an empty/error state (see `resources/js/pages/errors/Error.tsx` and the
"Collection unavailable" state in `resources/js/pages/collection/Index.tsx`).

1. Confirm RSBE is actually unreachable: `curl -i "$RS_V1_ENDPOINT/ping"` (or check
   `/ping` via RSUI itself, which proxies to the same endpoint through
   `HealthController`).
2. Check `storage/logs/laravel.log` for `ConnectionException`/`RequestException` entries
   around the same timestamp — these confirm whether RSUI reached RSBE at all or timed
   out.
3. If RSBE is down, there is no RSUI-side fix: escalate to the RSBE team. RSUI's error
   pages and empty states are intentionally designed to degrade gracefully rather than
   retry or cache stale data.
4. Once RSBE recovers, no RSUI restart is required — every request re-authenticates
   against the current session cookie.

## Users are unexpectedly logged out

**Symptom:** A user who was working normally is suddenly redirected to `/login` with
"Your external session has expired."

1. This is expected behavior of `CheckExternalAuthExpiration` once
   `external_auth_expires` (a session value, not a database row) is in the past. Confirm
   the user's session actually reached that expiry rather than being cleared early.
2. If this happens **immediately** after a fresh login, suspect a regression in
   `ExternalAuthController::login()`'s cookie selection (see
   `tests/Feature/ExternalApiServiceAuthCookieTest.php` for the exact regression this
   guards against): the RSBE response can carry more than one `Authorization`
   `Set-Cookie` entry, and only the most recent one has a valid expiry.
3. There is no server-side session store to inspect directly for this value — ask the
   affected user to re-login, and check browser dev tools / Laravel session driver
   storage (`SESSION_DRIVER`) if you need to inspect the live value.

## Clearing caches

RSUI relies on the standard Laravel caches. Run after any config/route change or a
deployment that isn't picked up automatically:

```bash
ddev php artisan config:clear
ddev php artisan route:clear
ddev php artisan view:clear
ddev php artisan cache:clear
```

There is no RSUI-owned domain cache (no partner/collection/file data is cached
server-side) — all "cache" issues are Laravel's own config/route/view compiled caches.

## Rolling back a release

Releases are built by `.github/workflows/build-release.yml` on tag push (`v*`), which:

1. Installs PHP/Node dependencies without dev packages.
2. Builds frontend assets (`pnpm run build`) and verifies `public/build` exists.
3. Packages the app (excluding `.git`, `tests`, `node_modules`, etc.) into
   `release.tar.gz` and attaches it to a GitHub Release (marked prerelease for tags
   containing `alpha`/`beta`/`rc`/`dev`/`preview`).
4. Triggers `deploy-dev` or `deploy-prod` depending on the tag (deployment steps are
   currently placeholders — fill in with the actual deploy mechanism used for your
   environment).

To roll back:

1. Identify the last known-good tag/release in the GitHub Releases list.
2. Re-deploy that release's `release.tar.gz` using whatever mechanism `deploy-dev`/
   `deploy-prod` use in your environment (SSH pull, artifact download, etc.).
3. Run `php artisan config:clear && php artisan route:clear` after swapping code, and
   restart the PHP process manager (php-fpm/Octane/whatever serves production).
4. There are no destructive database migrations tied to `RS UI` domain data — the local
   `users` table is populated by upsert on login (see `ExternalAuthController::login()`),
   so rolling back code does not require a database rollback in the common case. Confirm
   this still holds before rolling back across a migration-bearing release.

## Vite manifest errors ("Unable to locate file in Vite manifest")

**Symptom:** A blank page or a Laravel `ViteException` in the logs.

- In development, run `ddev npm run dev` (or `composer run dev`) so the Vite dev server
  is serving assets.
- In production/staging, run `ddev npm run build` (or the release pipeline's build step)
  so `public/build/manifest.json` exists.
- During E2E runs specifically, ensure `public/hot` does not exist — its presence makes
  Laravel emit dev-server `<script>` tags even when no dev server is running, which
  renders a blank page in the browser. `scripts/e2e.sh` manages this automatically.

## Related documentation

- Architecture/decision context: `docs/adr/`
- External API endpoints and payload shapes: `docs/api-contract.md`
- Current test coverage and gaps: `docs/testing-plan.md`
- Outstanding hardening work: `docs/production-readiness-plan.md`
