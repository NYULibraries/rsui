# 0004 — Delegate authorization and path safety to the external API

## Context

Every partner, collection, path, and workflow a user can see is ultimately governed by
RSBE's own access rules (roles, privileges, per-partner/collection permissions). RSBE's
API team confirmed they already enforce these checks — and path traversal/normalization
— on every request RSUI proxies to them.

## Decision

RSUI does not implement a local authorization policy layer (Laravel gates/policies for
partner/collection/path access) and does not re-validate or re-normalize RSBE-owned path
segments beyond its own routing-prefix transformation (`/fs`, `/download`, `/preview`).
RSUI's own responsibility is limited to: authentication/session middleware
(`CheckExternalAuthExpiration`), request input validation (form requests), and
preserving the upstream path/response contract unchanged (see `docs/api-contract.md`).

This was an explicit, confirmed boundary with the RSBE team — not an oversight — and is
intentionally *not* listed as an open risk in `docs/production-readiness-plan.md`.

## Consequences

- RSUI tests should verify that requests are forwarded with the correct session/path,
  not that authorization/traversal rules are enforced locally — that coverage belongs to
  RSBE's own test suite.
- If RSBE's enforcement ever changes or is found to be incomplete, this ADR should be
  superseded (new ADR) rather than silently patched around in RSUI, since it reflects a
  cross-team agreement, not just a code shortcut.
- Any new proxy-style route added to RSUI (following the pattern in ADR 0003) inherits
  this same boundary by default: forward the authenticated request and preserve RSBE's
  response/path contract, without inventing local policy or path-sanitization logic.
