# RS UI Test Plan (Documentation Only)

This plan documents tests that should be added to improve confidence in high-risk behavior.  
No tests in this file are implemented yet.

## Goals

- Protect critical partner/collection/file navigation behavior.
- Verify external API integration contracts and failure handling.
- Ensure search pagination and response shaping remain stable.
- Confirm UI state persistence (theme + navigation state) behaves as expected.

## Priority 1: External API service contracts

1. `ExternalApiService::getPath`
   - Maps child `url` values from external endpoint to `/fs/...`.
   - Maps `download_url` to `/download/...` and derives `preview_url` to `/preview/...`.
   - Returns `null` when upstream response fails or response JSON is not an array.
2. `ExternalApiService::makeRequest`
   - Throws/returns null behavior when auth cookie is missing or session is expired.
   - Sends expected request headers and Authorization cookie.
3. `ExternalApiService::search`
   - Includes `scope=packages`, `term`, `rows`, and `start` query parameters.
   - Produces collection metadata (`qTime`, `numFound`, `start`, `rows`) with sane defaults.
4. `ExternalApiService::downloadFile`
   - Returns streamed response with attachment disposition.
   - Handles invalid URL and missing auth cookie error paths with 500 stream output.

## Priority 2: Controller response behavior

1. `SearchController::index`
   - Defaults to page 1 and computes `start` offset as `(page - 1) * rows`.
   - Returns expected Inertia props (`term`, `results`, `numFound`, `start`, `page`, `totalPages`, `error`).
   - Handles empty term without external API call.
2. `SearchController::apisearch`
   - Returns empty array for blank term.
   - Returns search payload for valid term and pagination inputs.
3. `SearchController::autocomplete`
   - Enforces minimum term length.
   - Returns transformed `package_search_response` values for matching docs.
   - Handles upstream errors with safe empty JSON response.

## Priority 3: Frontend integration behavior

1. `workflowAppliesToItem` (`resources/js/lib/workflows.ts`)
   - Rejects a workflow when `applies_to.object_types` excludes the item's `object_type`.
   - Treats a missing/empty `applies_to.mime_types` as unrestricted.
   - Restricts files to the advertised `mime_types` (e.g. transcode/push only accepting media types).
   - Matches exact patterns (`video/mp4`), subtype wildcards (`video/*`), and `*`.
   - Normalizes mime parameters and casing (`Text/Plain; charset=utf-8` matches `text/plain`).
   - Rejects a mime-restricted workflow when the file has no `mime_type`.
   - Ignores `mime_types` for directories, which carry no mime type.
2. `getApplicableWorkflows` / `mergeWorkflows`
   - De-duplicates workflows advertised on both the parent directory and the child item.
   - Preserves ordering of the first occurrence.
3. `WorkflowDialogTrigger`
   - Preselects the action chosen from the table and still allows switching actions.
   - Re-validates prop-supplied workflows so an ineligible action is never preselected or listed.
   - Rebuilds the parameter form when the selected action changes.
   - Submits `workflow_id` plus context and user parameters for the selected action.
4. `useAppearance` hook
   - Initializes from `localStorage` with defaults on missing/invalid state.
   - Applies dark class correctly for `light|dark|system`.
   - Persists updates to `localStorage` and updates appearance cookie.
5. File explorer navigation component
   - Initializes history/current directory from server-provided storage array.
   - Navigates directories and updates browser history path.
   - Handles missing item URLs defensively without hard crash.
6. Search page pagination UI
   - Uses backend-provided `page`, `totalPages`, and `numFound` consistently.
   - Preserves term while navigating between pages.

## Suggested execution order

1. Add/expand feature tests for SearchController.
2. Add focused unit/feature tests for `ExternalApiService` mapping and failure handling.
3. Add React tests for `useAppearance` and file explorer navigation behavior.

## Notes

- Prefer Pest feature tests for request/response behavior.
- Use mocks for external API boundaries to keep tests deterministic.
- Add small frontend tests first around hooks and pure state transitions, then component interaction coverage.
