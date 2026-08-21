# RS UI Testing Plan

This document lists the remaining test work. Completed coverage is recorded so it is
not planned again.

## Current coverage

- **PHP:** 38 feature tests pass through `ddev php artisan test`.
- **E2E:** 17 Playwright tests pass through `ddev exec npm run test:e2e`.
- **E2E infrastructure:** the suite uses a hermetic mock RS API and an isolated
  `.env.e2e`; the real upstream and developer `.env` are not used.
- **Covered journeys:** authentication, session persistence, dashboard browsing,
  collection and directory navigation, keyboard directory navigation, workflow
  filtering/submission, custom 404/502 pages, and the file-table column regression.
- **Covered PHP contracts:** external path shaping and failure responses, rotated auth
  cookies, error-page status mapping, JSON error preservation, search pagination, and
  settings behavior.

## Remaining priorities

### P0 — route protection and request validation

- Table-drive every authenticated route and verify guest redirects.
- Add expired external-session coverage for every protected entry point.
- Authorization and role/privilege checks are enforced by the external RS API and are
  intentionally not duplicated in RSUI. Preserve this boundary in integration tests and
  documentation rather than adding local policies.
- Test workflow submission validation and the RSUI-owned `/fs` prefix transformation.
- Add login rate-limit coverage after the intended threshold.

### P1 — focused PHP service contracts

- Cover all remaining `ExternalApiService` facade methods with realistic fixtures:
  partners, collections, search, workflows, profile/password updates, and ping.
- Cover malformed payloads, connection failures, timeout behavior, and empty successful
  responses for the extracted `ExternalApiClient`.
- Add focused streaming tests for `ExternalFileDownloader`, including invalid URLs and
  upstream failures.
- Add route-controller tests for filesystem, download, and health endpoint response
  contracts.
- Verify cache behavior if caching is reintroduced; cache keys must include auth context.
- Add reusable external-auth and API fixture helpers to reduce hand-written test setup.

### P1 — frontend unit/component tests

Add a JavaScript test runner and begin with deterministic, low-cost tests:

- `lib/workflows.ts`: object-type matching, exact and wildcard MIME matching, missing
  MIME values, deduplication, ordering, and malformed/empty workflow data.
- `apiFetch`/`apiFetchText`: empty bodies, non-2xx responses, HTML/session-expiry
  responses, malformed JSON, and credentials behavior.
- `WorkflowDialogTrigger`: parameter switching, required-field validation, context
  parameter resolution, success/error toasts, and no request on dialog open.
- `FileExplorer`: initialization, breadcrumb history, fetch failures, filtering, and
  keyboard navigation.
- `use-appearance` and `session-manager`: persistence, system theme behavior, expiry
  warnings, and refresh behavior.
- `FilePreviewer`, `PartnersTable`, and `PartnerCollectionsTable`: supported MIME
  branches, unsupported content, sorting, and row navigation.

### P1 — accessibility regression coverage

- Run an automated axe scan against the login, dashboard, collection, workflow dialog,
  preview dialog, and error page.
- Verify dialog focus return, labels/descriptions, keyboard operation, and escape
  behavior.
- Keep the directory-row keyboard E2E regression in place.

### P2 — operational confidence

- Add coverage reporting with a baseline that can be ratcheted upward.
- Add browser tests for profile/password updates and search pagination/open-result flows.
- Add visual or snapshot coverage only after the component test runner is established.

## Test execution

```bash
ddev php artisan test
ddev exec npm run types
ddev exec npm run test:e2e
```

The E2E script builds production assets, starts the mock API and isolated Laravel
environment, runs Playwright, and cleans up its processes and temporary environment.
