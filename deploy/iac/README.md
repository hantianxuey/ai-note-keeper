# Environment IaC

This directory is the source of truth for environment configuration. Public files are committed; private values stay outside Git.

## Rules

- Commit only `common.*.env`, `*.public.env`, and `*.private.env.example`.
- Put real private values in `deploy/iac/private/*.env`, `backend/.env`, `frontend/.env.local`, GitHub Secrets, or `/opt/ai-note-keeper/shared/backend.env`.
- Never commit `deploy/iac/private/*.env`.
- Frontend production builds must use `VITE_API_URL=/api` so the browser stays on same-origin HTTPS.
- LLM and embedding provider API keys are user-owned Settings data, not global server configuration.
- Deployments must go through GitHub Actions: push code, get the package id from **Build Package**, then run **Deploy Package** with that package id.

## Layers

Environment files are merged in this order:

1. `common.<target>.env`
2. `<env>.<target>.public.env`
3. `private/<env>.<target>.env`

Examples are used only when the render command is passed `--allow-example-private`.

## Environments

- `local`: developer machine defaults.
- `ci`: GitHub Actions test and package validation defaults.
- `production`: deployed service defaults.

## Commands

Render local files:

```bash
node scripts/iac/render-env.mjs --env local --target backend --out backend/.env --allow-example-private
node scripts/iac/render-env.mjs --env local --target frontend --out frontend/.env.local --allow-example-private
```

Validate all environment rendering:

```bash
node scripts/iac/check-env.mjs
```

Load env in Bash scripts:

```bash
source scripts/iac/load-env.sh production backend
```
