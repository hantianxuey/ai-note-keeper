# AI Note Keeper Aliyun ECS Deployment

This repository deploys to Aliyun ECS `8.136.39.247` through GitHub Actions.

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
- Release package smoke test: install production backend dependencies from the generated package, start `node dist/server.js`, and verify `/health`.

Coverage gates:
- Global coverage minimums are configured in `frontend/vitest.config.ts` and `backend/vitest.config.ts`.
- Incremental coverage checks changed source lines against `INCREMENTAL_COVERAGE_THRESHOLD`, currently `60%`.
- If either global coverage or incremental coverage fails, the workflow stops before packaging and the pull request cannot pass the required build check.

### Deploy Package

File: `.github/workflows/deploy.yml`

Trigger:
- Manual only. Open GitHub Actions, choose `Deploy Package`, and enter a package id such as `ai-note-keeper-snapshot-42-a1b2c3d` or `ai-note-keeper-release-42-a1b2c3d`.

The deploy job downloads that package artifact, uploads it to ECS, extracts it under `/opt/ai-note-keeper/releases/<package-id>`, updates `/opt/ai-note-keeper/frontend` and `/opt/ai-note-keeper/backend` symlinks, installs the packaged Nginx config, runs production dependency install for the backend, reloads PM2, and reloads Nginx.

Both `snapshot` and `release` packages can be deployed manually by package id. The difference is automation: `snapshot` packages are never deployed automatically, while the daily scheduled `release` package is deployed automatically after build gates pass.

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
| `VITE_API_URL` | Optional | `http://8.136.39.247/api` | Defaults to `http://8.136.39.247/api`. |

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

## Backend Environment

Keep production secrets on ECS, not in GitHub Actions. The workflow preserves `/opt/ai-note-keeper/backend/.env` across releases.

Minimum required values:

```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/ainotes
JWT_SECRET=replace-with-a-strong-secret
DEFAULT_LLM_PROVIDER=openai
DEFAULT_LLM_MODEL=gpt-3.5-turbo
```

Add provider keys as needed:

```env
OPENAI_API_KEY=
QWEN_API_KEY=
DEEPSEEK_API_KEY=
EMBEDDING_QWEN_API_KEY=
PINECONE_API_KEY=
PINECONE_INDEX=
PINECONE_ENVIRONMENT=
```

## Database Migrations

Schema changes are versioned under `backend/migrations` as paired `*.up.sql` and `*.down.sql` files. The backend package exposes:

```bash
npm run migrate
npm run migrate:rollback
```

Deployments run `npm run migrate` after production dependencies are installed and before PM2 reloads the backend. Applied versions are recorded in the `schema_migrations` table.

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
