# Contributing to RS UI

Thanks for contributing! This project is a Laravel + Inertia + React proxy/UI over an
external RS API — see `README.md` for the architecture overview and `docs/adr/` for why
key decisions were made.

## Getting set up

Follow **Quick start** in `README.md`. All commands run through `ddev`.

## Branching and commits

- Branch from `main` using a short descriptive name (e.g. `fix/workflow-toast`,
  `feat/search-pagination`).
- Write commit messages in the imperative mood ("Add workflow toast", not "Added" or
  "Adds"), with a short summary line and, when useful, a body explaining *why*.
- Keep commits focused; avoid mixing unrelated refactors with a feature/bugfix.

## Before opening a PR

Run the checks relevant to what you changed:

```bash
# PHP
ddev php artisan test
vendor/bin/pint --dirty
composer run analyse

# Frontend
ddev npm run types
ddev npm run lint
ddev npm run format:check

# End-to-end (only if you touched user-facing flows)
ddev npm run test:e2e
```

All of the above must pass before requesting review. See `docs/testing-plan.md` for
current coverage and known gaps, and `tests/e2e/README.md` for E2E specifics.

## PR expectations

- Every behavioral change should be covered by a new or updated test (Pest for PHP,
  Playwright for user-facing flows). See `AGENTS.md` and `docs/testing-plan.md`.
- Update relevant documentation in the same PR: `README.md`, `docs/api-contract.md` if
  you touch an external API integration, `docs/adr/` if you make a decision worth
  recording, and `docs/production-readiness-plan.md` if you close out a listed item.
- Keep the PR description focused: what changed, why, and how it was validated (paste
  the relevant test output).
- Note any RSBE-owned behavior you relied on (see "Authorization and path safety" in
  `README.md`) rather than re-implementing it locally.

## Code style

Follow the conventions already documented in `AGENTS.md` (tech stack, naming, component
patterns, styling) and the Laravel/Pest/Inertia guidance embedded in this repository's
agent instructions. When in doubt, match the nearest sibling file.

## Reporting bugs / requesting features

Use the issue templates in `.github/ISSUE_TEMPLATE/`. For security vulnerabilities, do
**not** open a public issue — see `SECURITY.md`.
