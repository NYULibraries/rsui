# 0001 — Delegate identity and session state to the external RSBE API

## Context

RS UI needs authenticated users, but RSBE is the actual system of record for accounts,
credentials, and permissions. Building a fully independent Laravel auth stack
(registration, password reset, email verification) would duplicate RSBE's own identity
management and create two sources of truth that can drift out of sync.

## Decision

RSUI authenticates against RSBE's `sessions` endpoint (`ExternalAuthController::login()`),
storing the returned `Authorization` cookie value and expiry in the Laravel session as
`external_auth_cookie` / `external_auth_expires`. A local `User` row is created/updated
purely so Laravel's own `Auth` facade and middleware have something to authenticate
against — it is not an independent credential store. `CheckExternalAuthExpiration`
mirrors the upstream session's lifetime onto the local Laravel session so the two never
drift: once the RSBE cookie would be expired, the local session is invalidated too.

Registration, password reset, and email verification are intentionally **not**
implemented in RSUI; they are RSBE's responsibility.

## Consequences

- No RSUI-side password storage risk for the "real" credential — the local `User.password`
  is a random, unusable placeholder (see `ExternalAuthController::login()`).
- RSUI cannot authenticate a user (even for testing) without a working RSBE `sessions`
  endpoint or a hermetic mock of it (see `tests/e2e/mock-api/`).
- Every authenticated request must carry a live `external_auth_cookie`; if RSBE issues
  more than one `Authorization` `Set-Cookie` in a response, RSUI must select the most
  recent one (see `docs/RUNBOOK.md` → "Users are unexpectedly logged out").
- Session lifetime is bounded by RSBE's cookie expiry, not Laravel's own
  `SESSION_LIFETIME` — the shorter of the two effectively governs UX.
