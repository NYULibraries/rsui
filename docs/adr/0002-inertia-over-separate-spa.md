# 0002 — Use Inertia.js instead of a separate SPA/API pair

## Context

RS UI needs a modern React UI over server-rendered routing/session state, without
standing up and maintaining a fully separate API layer, CORS configuration, and
client-side routing/auth stack alongside Laravel.

## Decision

Use Inertia.js to let Laravel controllers return React page components
(`Inertia::render(...)`) directly, with Ziggy providing named-route access on the
frontend. Controllers remain the single place that talks to the external RS API and
shapes data for the page; React components consume typed props rather than calling a
separate first-party JSON API for page loads (some client-only fetches remain for
in-page interactions — see `resources/js/lib/api.ts`).

## Consequences

- No duplicate routing table or auth middleware between a JSON API and an SPA — Laravel
  session auth and middleware (`CheckExternalAuthExpiration`, `auth`) protect Inertia
  page requests uniformly.
- Full-page navigations are Inertia visits (`router.visit`, `<Link>`), not client-side
  route matching against a separate API contract; see the "Inertia Core"/"Inertia v2"
  conventions in `AGENTS.md`.
- Server and client stay coupled by controller-shaped props, which is why
  `resources/js/types/index.d.ts` explicitly distinguishes "external API payload models"
  from "app/Inertia view models" — the former must track RSBE's contract
  (`docs/api-contract.md`), the latter is free to change with the UI.
- A handful of routes remain thin JSON endpoints (`/api/search`, `/api/search/autocomplete`,
  workflow submission, file previews) for interactions that don't warrant a full page
  visit; these use the shared `apiFetch`/`apiFetchText` helpers rather than a second
  routing/auth stack.
