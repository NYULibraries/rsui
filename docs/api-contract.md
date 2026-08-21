# External RS API contract

RSUI has almost no domain data of its own: it is a Laravel/Inertia proxy and UI over an
external API ("RSBE"). This document is the source of truth for every endpoint RSUI
consumes, the shape of the requests/responses it depends on, and where that contract is
implemented in code. If RSBE changes any of these shapes, update this file and the
corresponding TypeScript/PHP types in the same change.

All requests below are made through `App\Services\ExternalApiClient` (authenticated
transport) or `App\Services\ExternalApiService` (domain operations), against the base
URL configured by `RS_V1_ENDPOINT` (see `config/services.php` → `services.rs.v1.endpoint`).

## Authentication

### `POST {endpoint}sessions`

Used by `ExternalAuthController::login()`.

**Request body:** `{ "email": string, "password": string }`

**Response:** JSON body containing at least `{ "username": string }`, plus a `Set-Cookie`
header with an `Authorization` cookie. The cookie's `Value` is stored as
`external_auth_cookie` in the Laravel session and sent as the `Authorization` header on
every subsequent request. The cookie's `Expires` attribute is stored as
`external_auth_expires` and drives session expiry (see `CheckExternalAuthExpiration`).

> The response can include more than one `Authorization` `Set-Cookie` entry; RSUI always
> selects the **last** matching cookie in the jar, since only the most recent reliably
> carries a usable expiry (see `docs/production-readiness-plan.md` for the incident this
> fixed).

## Health

### `GET {endpoint}ping`

Used by `ExternalApiService::ping()` and the `/ping` route (`HealthController`). Any
successful JSON response is treated as healthy.

## Partners

### `GET {endpoint}partners`

Returns the partner list. Shape mirrors `resources/js/types/index.d.ts` → `Partner`.

### `GET {endpoint}partners/{id}`

Returns a single partner. `ExternalApiService::getPartnerById()` additionally fetches
`GET {endpoint}partners/{id}/colls` and merges the result under `collections`.

### `GET {endpoint}partners/{id}/colls`

Returns the collections owned by a partner. Shape mirrors `Collection[]`.

## Collections

### `GET {endpoint}colls/{id}`

Returns a single collection (`Collection` shape). Must include `partner_id`; RSUI
additionally fetches `GET {endpoint}partners/{partner_id}` and nests the result under
`partner`. `storage_url` is rewritten from the configured endpoint prefix to RSUI's own
`/fs/` prefix (see `CollectionController`) — RSUI does not alter the rest of the path.

## File-system paths (`/fs`)

### `GET {endpoint}{path}?include=workflows`

Used by `ExternalApiService::getPath()` for the `/fs/{path}` route (`FileSystemController`).
`{path}` is the upstream-owned RSBE path — RSUI does not apply its own traversal/
normalization rules to it beyond the `/fs` prefix rewrite (see "Authorization and path
safety" in `README.md`). The response is expected to include `FileItem`-shaped entries,
optionally with `available_workflows.directory` / `available_workflows.file` arrays of
`Workflow` objects (see `resources/js/types/index.d.ts` and `resources/js/lib/workflows.ts`
for the `applies_to.object_types` / `applies_to.mime_types` eligibility rules).

## Workflows

### `POST {endpoint}jobs`

Used by `ExternalApiService::submitWorkflow()` for workflow submission
(`WorkflowDialogTrigger` → workflow route).

**Request body:**

```json
{
  "workflow_id": "string",
  "parameters": { "<name>": "string", "...": "..." }
}
```

**Response:** `{ "job_id"?: string, "status"?: string, "message"?: string }`.

> **Unverified assumption:** `applies_to.mime_types` handling (exact match, `type/*`
> wildcard, or bare `*`) was implemented against an inferred schema and has not been
> confirmed against a real payload. See §5 of `docs/production-readiness-plan.md`.

## Search

### `GET {endpoint}search?scope=packages&term={term}&start={start}&rows={rows}`

Used by `ExternalApiService::search()` for `/search` and `/api/search*`
(`SearchController`). Response shape:

```json
{
  "response": {
    "numFound": 0,
    "start": 0,
    "docs": [{ "package_search_response": { "...": "SearchResult shape" } }]
  }
}
```

See `SearchResult` in `resources/js/types/index.d.ts` for the per-document fields.

## Users

### `PATCH {endpoint}users`

Used by `ExternalApiService::updateUserName()` (`{ "username": string }` body) and
`updateUserPassword()` (password-change fields, forwarded as-is from
`Settings/PasswordController`).

## Downloads

Streamed via `App\Services\ExternalFileDownloader`, authenticated with the same
`external_auth_cookie`. The URL is derived from the RSBE-provided path; RSUI does not
reshape it beyond its own `/download` routing prefix.

## Ownership boundary

RSBE — not RSUI — owns and enforces authorization, roles/privileges, and path
traversal/normalization for every endpoint above. RSUI's responsibility is limited to:
forwarding the authenticated session, validating its own request inputs, and preserving
the upstream path/response contract. See "Authorization and path safety" in `README.md`.
