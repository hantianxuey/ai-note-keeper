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

`1.5.0` is a minor release focused on database lifecycle management:

- Database schema is managed by versioned SQL migrations in `backend/migrations`.
- `npm run migrate` applies pending migrations through `schema_migrations`.
- `npm run migrate:rollback` rolls back the latest migration for controlled recovery.
- CI and deployment use the same migration entry point instead of ad hoc `init.sql` execution.

`1.6.0` is a minor release focused on security hardening:

- Browser security headers are enabled through Helmet.
- Authentication endpoints have rate limiting for login and registration attempts.
- JSON and URL-encoded request bodies use a configurable size limit.
- Stored LLM and embedding API keys are encrypted with AES-256-GCM and remain backward compatible with historical plaintext rows.
- ECS setup documents production proxy and encryption-secret defaults.

`1.7.0` is a minor release focused on quality evaluation and operability:

- CI runs a deterministic RAG quality eval after the Playwright critical path.
- The RAG eval reports citation hit rate against a fixed source-note dataset.
- Backend requests use structured Pino logs with request IDs.
- Prometheus-compatible HTTP metrics are available at `/metrics`.
- Deployments run a post-switch readiness smoke test and automatically roll back symlinks to the previous release when it fails.

`1.8.0` is a minor release focused on application security:

- Registration requires one-time email verification codes backed by versioned database migrations.
- Password and API-key submission paths use frontend RSA-OAEP encryption before posting sensitive fields.
- Production email verification is SMTP-backed, with dev-code exposure limited to local and CI use.
- CORS supports explicit multi-origin production allowlists.
- Cloudflare Full (strict) Nginx template and origin-certificate paths are documented.
- CI scans tracked files for common secret patterns before packaging.

`1.9.0` is a minor release focused on secure media attachments:

- Frontend auth tests verify login and registration requests send encrypted passwords without plaintext password fields.
- Note images can be uploaded through authenticated APIs with server-side MIME allowlists and magic-byte validation.
- Image content is served through authenticated attachment routes instead of public static file paths.
- Deleting a note also schedules cleanup for its uploaded image files to reduce long-term disk growth.
- RAG indexing strips image markup so uploaded images are not interpreted as note text by AI workflows.

`1.9.1` is a patch release focused on dependency and vector-store operations:

- Removed the unused legacy `langchain` package to eliminate its vulnerable transitive dependency chain.
- Production dependency audit now reports no backend runtime vulnerabilities.
- ECS setup now provisions ChromaDB as a localhost-only Podman systemd service with persistent shared storage.

`1.9.2` is a patch release focused on registration email configuration and summary reuse:

- Email verification supports either `SMTP_URL` or discrete `SMTP_HOST` settings, with clearer production config errors.
- Note AI summaries are cached by authenticated note ID and content hash, so unchanged notes reuse the last generated summary.
- Summary cache columns are managed by migration `004_note_summary_cache`.
- Registration shows a success notice after verification-code delivery and enforces a client-side resend cooldown.
- Production PM2 limits Node heap usage and skips startup reindex by default to reduce memory pressure on small ECS instances.

## Server Storage Policy

- Keep the newest 5 deployment releases by default.
- Delete shared application logs older than 14 days by default.
- Rotate PM2 and Nginx logs daily, compress old logs, and cap individual rotated files at 50 MB.
- Tune `RELEASES_TO_KEEP` and `LOG_RETENTION_DAYS` in GitHub Actions if the ECS disk size changes.
