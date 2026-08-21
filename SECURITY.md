# Security Policy

## Reporting a vulnerability

If you discover a security vulnerability in RS UI, please **do not** open a public
GitHub issue or pull request describing it.

Instead, report it privately using one of the following:

- GitHub's [private vulnerability reporting](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing/privately-reporting-a-security-vulnerability)
  feature on this repository ("Security" tab → "Report a vulnerability"), if enabled.
- Contact the repository maintainers directly through NYU Libraries' standard internal
  security reporting channel.

Please include:

- A description of the vulnerability and its potential impact.
- Steps to reproduce it (a minimal repro is very helpful).
- Any relevant logs, requests, or screenshots (redact credentials/session cookies).

## Scope notes

- RS UI delegates authorization, roles/privileges, and path traversal/normalization
  enforcement to the external RSBE API (see "Authorization and path safety" in
  `README.md` and `docs/adr/0004-delegate-authorization-and-path-safety.md`). Findings
  in that area should also be reported to the RSBE API team, since RSUI does not
  duplicate that enforcement locally.
- RSUI does not store the "real" user credential locally — the local `User.password` is
  a random placeholder used only so Laravel's `Auth` facade has something to
  authenticate against (see `docs/adr/0001-external-auth-over-laravel-auth.md`). The
  actual credential lives in RSBE.

## Response

We aim to acknowledge reports promptly and will work with you to understand, confirm,
and remediate valid findings before any public disclosure.
