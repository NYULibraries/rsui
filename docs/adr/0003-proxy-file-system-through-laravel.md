# 0003 — Proxy the external file system through Laravel rather than exposing RSBE directly

## Context

Users need to browse, preview, and download files that live behind RSBE's storage
layer. Pointing the browser directly at RSBE would require distributing RSBE
credentials/cookies to the client, bypassing Laravel's session and CSRF protections,
and coupling the frontend to RSBE's own URL scheme and CORS configuration.

## Decision

RSUI exposes its own `/fs/{path}`, `/preview/{path}`, and `/download/{path}` routes,
backed by thin controllers (`FileSystemController`, `FilePreviewController`,
`DownloadController`) that call `ExternalApiService`/`ExternalApiClient`/
`ExternalFileDownloader` server-side, authenticated with the session's
`external_auth_cookie`. The browser only ever talks to RSUI's own domain; RSUI performs
the authenticated upstream request and streams/returns the result.

`CollectionController` rewrites a collection's `storage_url` from the configured RSBE
endpoint prefix to RSUI's own `/fs/` prefix so links rendered in Inertia pages point back
through this proxy rather than at RSBE directly.

## Consequences

- The external `Authorization` cookie never needs to reach the browser — it stays
  server-side in the Laravel session, reducing credential exposure surface.
- RSUI must preserve RSBE's own path segments byte-for-byte beyond its own `/fs`/
  `/download`/`/preview` prefix rewrite; it does not re-normalize or re-validate the path
  itself (see ADR 0004 and "Authorization and path safety" in `README.md`).
- File downloads/previews add one network hop (browser → RSUI → RSBE) instead of a
  direct browser → RSBE request, in exchange for not exposing RSBE credentials or URL
  shape to the client.
- Streaming downloads depend on `ExternalFileDownloader`'s cURL-based streaming
  implementation staying compatible with RSBE's response format (headers, chunking).
