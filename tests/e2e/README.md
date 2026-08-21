# End-to-end tests

Browser-level smoke tests covering the application's critical user journeys, built with
[Playwright](https://playwright.dev).

## Running them

```bash
ddev exec npm run test:e2e
```

To run a single spec or filter by title:

```bash
ddev exec npm run test:e2e -- 03-workflow
ddev exec npm run test:e2e -- -g "confirmation toast"
```

## How it works

The application proxies **all** domain data through `ExternalApiService`, server-side in
PHP. That means the browser never talks to the RS backend directly, so request stubbing
from inside Playwright cannot intercept it.

Instead, the suite runs against a **mock RS API** — a small Node HTTP server in
`mock-api/` — and points a dedicated Laravel instance at it:

```
Playwright ──▶ php artisan serve (APP_ENV=e2e) ──▶ mock RS API
                     :8088                            :9911
```

`scripts/e2e.sh` orchestrates this. It:

1. builds the frontend assets,
2. writes an isolated `.env.e2e` (derived from `.env`, which is **never modified**),
3. starts the mock API and an `APP_ENV=e2e` application server,
4. runs Playwright, then tears everything down.

Because `APP_ENV=e2e` makes Laravel load `.env.e2e`, your normal `.env` and the real
upstream are untouched. No test ever contacts the real RSBE.

### Environment gotchas

These were all discovered the hard way; change them with care.

- **`SESSION_DOMAIN` must be `null`.** A domain-scoped cookie (`rsui.ddev.site`) is
  silently rejected by a browser on `127.0.0.1`, which destroys the session and makes
  every CSRF-protected POST redirect back to `/login`.
- **`public/hot` must be absent.** If the Vite dev server is running, Laravel emits
  script tags pointing at `https://rsui.ddev.site:5173`, which the test browser cannot
  reach — resulting in a completely blank page. The script moves it aside and restores
  it afterwards.
- **Opcache is enabled in the ddev container.** After editing PHP you must restart
  `artisan serve` or your changes will not be visible.
- Fixture `url` / `download_url` values must be absolute and prefixed with the configured
  endpoint, because `getPath()` rewrites them via `str_replace($endpoint, '/fs', ...)`.
  A mismatch silently no-ops and breaks navigation.

## Asserting on backend traffic

The mock records every request it receives. `mockRequests(page)` returns them, which lets
a test assert on what the server actually sent upstream rather than only on what the UI
shows — for example, that a submitted job's `source_path` had its `/fs` prefix stripped.

`resetMock(page)` clears the log so a spec sees only its own traffic.

## Layout

| Path | Purpose |
| --- | --- |
| `specs/` | The test specs, numbered by journey. |
| `support/helpers.ts` | `login()`, `mockRequests()`, `resetMock()`, shared fixture IDs. |
| `mock-api/fixtures.mjs` | Fixture data (partner, collection, listings, workflows). |
| `mock-api/server.mjs` | The mock RS API request handler. |
| `mock-api/start.mjs` | Standalone entrypoint. |

## Notable regression guards

- **Table column count** (`02`) — files and directories must render the same number of
  `<td>`s as there are `<th>`s, guarding the missing-`<td>` bug.
- **No fetch on dialog open** (`03`) — the actions modal must not issue a network request
  when opened. It previously re-fetched the item URL, which returned a non-JSON body and
  surfaced as `JSON.parse: unexpected end of data` to users.
- **`mime_types` filtering** (`03`) — a video-only workflow must not be offered for a
  `text/plain` file.
- **Custom error pages** (`04`) — missing pages show the branded 404 experience, and
  upstream failures show the file-service-specific 502 experience.
