# Versioning and Release Policy

AI Note Keeper uses semantic versioning for code releases.

## Version Meaning

- Patch version, such as `1.4.1`: bug fixes, small test fixes, documentation corrections.
- Minor version, such as `1.4.0`: quality gates, production hardening, backward-compatible features.
- Major version, such as `2.0.0`: architectural changes, data model breaks, or behavior changes that require a migration plan.

## Branch Policy

- Daily development happens on short-lived branches prefixed with `codex/` or feature-specific prefixes.
- Major release history is preserved with long-lived branches named `release/v1`, `release/v2`, and so on.
- Before starting a new major version, create the matching release branch from the last stable commit of the previous major version.
- Minor and patch releases do not require long-lived branches unless they need ongoing maintenance.

## Current Release

`1.4.0` is a minor release focused on production quality:

- ChromaDB is configurable through `CHROMA_URL`.
- Health endpoints distinguish liveness from readiness.
- CI includes a Playwright E2E critical-path test.
- Deployment cleans old release directories automatically.
- PM2 and Nginx logs are rotated and old shared logs are cleaned.

## Server Storage Policy

- Keep the newest 5 deployment releases by default.
- Delete shared application logs older than 14 days by default.
- Rotate PM2 and Nginx logs daily, compress old logs, and cap individual rotated files at 50 MB.
- Tune `RELEASES_TO_KEEP` and `LOG_RETENTION_DAYS` in GitHub Actions if the ECS disk size changes.
