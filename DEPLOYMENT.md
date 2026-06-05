# AI Note Keeper Aliyun ECS Deployment

This repository deploys to Aliyun ECS `8.136.39.247` through GitHub Actions. Do not deploy from a local machine directly; push to GitHub, let the package workflow build the artifact, then deploy by package id.

## Workflows

### Build Package

File: `.github/workflows/build.yml`

Triggers:
- Pull request to `main`: run unit tests with coverage gates, lint, build, smoke test the packaged backend, and upload a `snapshot` package artifact. It does not deploy automatically.
- Push to `main`: run the same checks and upload a `snapshot` package artifact. It does not deploy automatically.
- Manual run: run the same checks and upload a `release` package artifact. It does not deploy automatically; deploy it with the package id through `Deploy Package`.
- Daily schedule: `04:00 UTC`, which is `12:00 Asia/Shanghai`. It builds a `release` package and deploys it automatically after the package passes all gates.

Package id format:

```text
ai-note-keeper-<snapshot|release>-<github-run-number>-<short-commit-sha>
```

The package is uploaded as a GitHub Actions artifact and retained for 30 days.

Build gates:
- Frontend unit tests with coverage: `npm run test:coverage`.
- Frontend incremental coverage: `npm run test:coverage:incremental`.
- Frontend lint: `npm run lint`.
- Frontend production build: `npm run build`.
- Backend unit tests with coverage: `npm run test:coverage`.
- Backend incremental coverage: `npm run test:coverage:incremental`.
- Backend lint: `npm run lint`.
- Backend production build: `npm run build`.
- Backend database migrations: `npm run migrate`.
- E2E critical path: register a user, create a note, search it, and ask the RAG chat through Playwright.
- RAG quality eval: create a fixed eval user and notes, ask RAG questions, and fail when citation hit rate drops below the threshold.
- Release package smoke test: install production backend dependencies from the generated package, start `node dist/server.js`, and verify `/health`.

Coverage gates:
- Global coverage minimums are configured in `frontend/vitest.config.ts` and `backend/vitest.config.ts`.
- Incremental coverage checks changed source lines against `INCREMENTAL_COVERAGE_THRESHOLD`, currently `60%`.
- If either global coverage or incremental coverage fails, the workflow stops before packaging and the pull request cannot pass the required build check.

### Deploy Package

File: `.github/workflows/deploy.yml`

Trigger:
- Manual only. Open GitHub Actions, choose `Deploy Package`, and enter a package id such as `ai-note-keeper-snapshot-42-a1b2c3d` or `ai-note-keeper-release-42-a1b2c3d`.

The deploy job downloads that package artifact, uploads it to ECS, extracts it under `/opt/ai-note-keeper/releases/<package-id>`, updates `/opt/ai-note-keeper/frontend` and `/opt/ai-note-keeper/backend` symlinks, installs the packaged Nginx config, runs production dependency install for the backend, reloads PM2, reloads Nginx, and verifies `/health/ready`.

If the post-deploy smoke test fails, the workflow switches the frontend and backend symlinks back to the previous release, reloads PM2 and Nginx, and exits with a failed deployment status. Database migrations should remain backward-compatible within the v1 release line so this automatic code rollback remains safe.

Both `snapshot` and `release` packages can be deployed manually by package id. The difference is automation: `snapshot` packages are never deployed automatically, while the daily scheduled `release` package is deployed automatically after build gates pass.

Recommended release path:

1. Push the branch or merge to `main`.
2. Wait for **Build Package** to pass.
3. Copy the package id from the workflow summary.
4. Run **Deploy Package** manually with that package id.

The backend install uses `npm ci --omit=dev --ignore-scripts` on ECS. This avoids native postinstall downloads that can hang in the server environment while keeping the API, PostgreSQL persistence, and fallback embedding behavior available.

## GitHub Secrets

Add these in GitHub repository settings: `Settings` -> `Secrets and variables` -> `Actions`.

| Secret | Required | Example | Notes |
| --- | --- | --- | --- |
| `ECS_SSH_PRIVATE_KEY` | Yes | `-----BEGIN OPENSSH PRIVATE KEY-----...` | Private key for the ECS SSH user. |
| `ECS_KNOWN_HOSTS` | Recommended | output of `ssh-keyscan -H 8.136.39.247` | If omitted, the workflow runs `ssh-keyscan` during deployment. |
| `ECS_HOST` | Optional | `8.136.39.247` | Defaults to `8.136.39.247`. |
| `ECS_USER` | Optional | `root` | Defaults to `root`. Use a deploy user if you create one. |
| `ECS_APP_PATH` | Optional | `/opt/ai-note-keeper` | Defaults to `/opt/ai-note-keeper`. |
| `VITE_API_URL` | Optional | `/api` | Defaults to `/api`; production frontend should use same-origin API routing. |

## Aliyun ECS Setup

On the Alibaba Cloud Linux ECS instance, make sure these are configured:

1. Security group allows inbound TCP `22` for SSH from GitHub Actions or your management IP.
2. Security group allows inbound TCP `80` for HTTP users.
3. The instance can install packages through `dnf` or `yum`.
4. The SSH public key matching `ECS_SSH_PRIVATE_KEY` is in the deploy user's `~/.ssh/authorized_keys`.
5. `/opt/ai-note-keeper/backend/.env` contains production values.

You can run the setup script on ECS:

```bash
sudo APP_PATH=/opt/ai-note-keeper SERVER_NAME=8.136.39.247 APP_USER=root bash deploy/setup-ecs.sh
```

The script only supports Alibaba Cloud Linux. It installs Node.js 20, PM2, Nginx, and OpenSSH server, then writes the Nginx site to `/etc/nginx/conf.d/ai-note-keeper.conf`.

If you run it by downloading from GitHub after this file is pushed:

```bash
curl -fsSL https://raw.githubusercontent.com/<owner>/<repo>/main/deploy/setup-ecs.sh | sudo bash
```

Replace `<owner>/<repo>` with the real GitHub repository path.

## Environment IaC

Committed configuration lives under `deploy/iac`:

- `common.backend.env`: public non-secret backend defaults.
- `local.backend.env.example` and `local.frontend.env.example`: local templates copied by `start-dev.ps1`.
- `production.backend.env.example`: production private template for `/opt/ai-note-keeper/backend/.env` or GitHub Secrets.
- `production.frontend.env`: public production frontend build values.

Local private files (`backend/.env`, `frontend/.env.local`) and production private files are ignored by Git. Do not edit local values into production templates or production values into local templates.

## Backend Environment

Keep production secrets on ECS, not in GitHub Actions. The workflow preserves `/opt/ai-note-keeper/backend/.env` across releases.

Minimum required values:

```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/ainotes
JWT_SECRET=replace-with-a-strong-secret
API_KEY_ENCRYPTION_SECRET=replace-with-a-different-strong-secret
EMAIL_VERIFICATION_SECRET=replace-with-a-third-strong-secret
REQUEST_ENCRYPTION_PRIVATE_KEY=
REQUEST_BODY_LIMIT=1mb
AUTH_RATE_LIMIT_WINDOW_MS=900000
AUTH_RATE_LIMIT_MAX=10
TRUST_PROXY=true
LOG_LEVEL=info
REINDEX_ON_STARTUP=false
CHROMA_URL=http://127.0.0.1:8000
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=replace-with-smtp-user
SMTP_PASS=replace-with-smtp-password
SMTP_FROM=no-reply@example.com
CORS_ALLOWED_ORIGINS=https://your-domain.example
```

LLM and embedding provider API keys are intentionally not production environment variables. Each authenticated user configures their own keys in Settings; the backend only uses demo mode or the current user's saved provider key.

## Database Migrations

Schema changes are versioned under `backend/migrations` as paired `*.up.sql` and `*.down.sql` files. The backend package exposes:

```bash
npm run migrate
npm run migrate:rollback
```

Deployments run `npm run migrate` after production dependencies are installed and before PM2 reloads the backend. Applied versions are recorded in the `schema_migrations` table.

## Security Settings

`API_KEY_ENCRYPTION_SECRET` encrypts API keys saved through Settings. Keep it stable across deployments; changing it without re-encrypting stored keys prevents encrypted keys from being read.

`EMAIL_VERIFICATION_SECRET` signs one-time registration verification codes. Keep it stable long enough for active codes to expire.

`REQUEST_ENCRYPTION_PRIVATE_KEY` is optional. If omitted, the backend generates an ephemeral RSA key on startup and the frontend fetches the matching public key from `/api/security/public-key`. For stable key rotation, set a PEM private key in ECS `.env` with escaped newlines.

`TRUST_PROXY=true` is recommended on ECS because Nginx forwards client IP information to Express. Authentication rate limits are controlled by `AUTH_RATE_LIMIT_WINDOW_MS` and `AUTH_RATE_LIMIT_MAX`.

Registration requires an email verification code. In production, SMTP must be configured. `EMAIL_VERIFICATION_EXPOSE_DEV_CODE=true` is only for CI or local smoke tests.

Run secret scans before pushing:

```bash
node scripts/security/scan-secrets.mjs
node scripts/security/scan-secrets.mjs --history
```

The CI build scans tracked files. If history scanning finds a real leaked key, rotate the key first, then rewrite repository history with a dedicated cleanup branch.

## Cloudflare

Cloudflare should use `Full (strict)` SSL/TLS mode for this application. Do not use `Flexible`, because it leaves the Cloudflare-to-origin hop on HTTP.

Server certificate layout expected by `deploy/nginx.cloudflare.conf`:

```text
/etc/nginx/cert/cert.pem
/etc/nginx/cert/cert.key
```

`cert.cer` can be kept as the provider/original certificate copy. Nginx should point `ssl_certificate` at the PEM certificate/fullchain file and `ssl_certificate_key` at the private key.

If your uploaded files use different names, create symlinks to those names. Then install the Cloudflare Nginx config:

```bash
sudo install -m 0644 deploy/nginx.cloudflare.conf /etc/nginx/conf.d/ai-note-keeper.conf
sudo nginx -t
sudo nginx -s reload
```

Cloudflare dashboard baseline:

- DNS record for the app domain points to ECS and is proxied.
- SSL/TLS mode is `Full (strict)`.
- Always Use HTTPS is enabled.
- HSTS is enabled after confirming HTTPS works end to end.
- WAF managed rules are enabled.
- Add rate limiting for `/api/auth/*`.
- Cache static frontend assets, bypass cache for `/api/*`, `/health*`, and `/metrics`.

## Observability

The backend emits structured JSON request logs through Pino. Every response includes `X-Request-Id`, and clients can pass their own `X-Request-Id` header to correlate browser, API, and server logs.

Prometheus-compatible metrics are exposed at:

```text
GET /metrics
```

The initial metric set includes HTTP request totals and request duration histograms by method, normalized route, and status code, plus Node.js default process metrics.

## First Deployment

1. Configure ECS with `deploy/setup-ecs.sh`.
2. Add GitHub Secrets.
3. Push to `main` and wait for `Build Package` to create a `snapshot` package, or manually run `Build Package` to create a `release` package.
4. Copy the package id from the workflow summary or artifact name.
5. Run `Deploy Package` manually with that package id.

Daily noon deployment runs automatically after the first successful setup.

## Branch Protection

Configure GitHub branch protection for `main`:

1. Open `Settings` -> `Branches`.
2. Add a branch protection rule for `main`.
3. Enable `Require status checks to pass before merging`.
4. Select the `Test, lint, build, and package` check from `Build Package`.
5. Enable `Require branches to be up to date before merging` if you want PRs rebased or merged with the latest `main` before approval.

With that rule, a pull request cannot merge when unit tests, global coverage, incremental coverage, lint, build, package assembly, or package smoke testing fails.

## Manual Operations

### Storage Cleanup

Each deployment keeps only the newest 5 release directories under `/opt/ai-note-keeper/releases` by default. It also deletes shared backend logs older than 14 days. Change `RELEASES_TO_KEEP` or `LOG_RETENTION_DAYS` in the workflow environment if the server disk budget changes.

`deploy/setup-ecs.sh` installs a logrotate policy for PM2 logs in `/opt/ai-note-keeper/shared/logs` and Nginx logs in `/var/log/nginx/ai-note-keeper.*.log`.

### Create a Snapshot Package

Open a pull request to `main`, or push to `main`. `Build Package` creates a package named like:

```text
ai-note-keeper-snapshot-42-a1b2c3d
```

This package can be deployed manually through `Deploy Package`, but it will not deploy automatically.

### Create a Release Package

Open GitHub Actions, choose `Build Package`, and run it manually. The workflow creates a package named like:

```text
ai-note-keeper-release-42-a1b2c3d
```

Manual release packaging does not deploy automatically. Copy the package id and run `Deploy Package`.

### Daily Release Deployment

At `12:00 Asia/Shanghai`, GitHub runs `Build Package` on the schedule. This creates a `release` package. If every gate passes, the same workflow deploys that release package automatically.

## Notes

- Lint is strict and runs before build.
- The deploy keeps release directories under `/opt/ai-note-keeper/releases`. Clean old releases manually if disk space becomes tight.
