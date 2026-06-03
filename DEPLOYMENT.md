# AI Note Keeper Aliyun ECS Deployment

This repository deploys to Aliyun ECS `8.136.39.247` through GitHub Actions.

## Workflows

### Build Package

File: `.github/workflows/build.yml`

Triggers:
- Push to `main`: run unit tests if configured, lint, build, and upload a package artifact.
- Manual run: same build flow. You can choose `deploy_after_build=true`.
- Daily schedule: `04:00 UTC`, which is `12:00 Asia/Shanghai`. It builds and deploys automatically.

Package id format:

```text
ai-note-keeper-<github-run-number>-<short-commit-sha>
```

The package is uploaded as a GitHub Actions artifact and retained for 30 days.

### Deploy Package

File: `.github/workflows/deploy.yml`

Trigger:
- Manual only. Open GitHub Actions, choose `Deploy Package`, and enter a package id such as `ai-note-keeper-42-a1b2c3d`.

The deploy job downloads that package artifact, uploads it to ECS, extracts it under `/opt/ai-note-keeper/releases/<package-id>`, updates `/opt/ai-note-keeper/frontend` and `/opt/ai-note-keeper/backend` symlinks, runs production dependency install for the backend, reloads PM2, and reloads Nginx.

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

## First Deployment

1. Configure ECS with `deploy/setup-ecs.sh`.
2. Add GitHub Secrets.
3. Push to `main` and wait for `Build Package`.
4. Copy the package id from the workflow summary or artifact name.
5. Run `Deploy Package` manually with that package id.

Daily noon deployment runs automatically after the first successful setup.

## Notes

- The repository currently has no explicit `test` script in `frontend/package.json` or `backend/package.json`. The workflow uses `npm test --if-present`, so real unit tests will run automatically after test scripts are added.
- Lint is strict and runs before build.
- The deploy keeps release directories under `/opt/ai-note-keeper/releases`. Clean old releases manually if disk space becomes tight.
