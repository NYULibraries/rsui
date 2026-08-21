# ADRs (Architecture Decision Records)

This directory records the significant, hard-to-reverse decisions already made in RS
UI's design, so future contributors understand *why* the app is shaped the way it is
rather than re-litigating settled tradeoffs.

Each ADR follows a short format: **Context**, **Decision**, **Consequences**. New ADRs
should be numbered sequentially (`000N-title.md`) and never edited after acceptance —
supersede an old decision with a new ADR that references it instead.

## Index

- [0001 — Delegate identity and session state to the external RSBE API](0001-external-auth-over-laravel-auth.md)
- [0002 — Use Inertia.js instead of a separate SPA/API pair](0002-inertia-over-separate-spa.md)
- [0003 — Proxy the external file system through Laravel rather than exposing RSBE directly](0003-proxy-file-system-through-laravel.md)
- [0004 — Delegate authorization and path safety to the external API](0004-delegate-authorization-and-path-safety.md)
