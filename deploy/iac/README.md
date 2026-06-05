# Environment Configuration

This directory separates public, local, and production configuration.

## Rules

- Public defaults can be committed.
- Local private values stay in `backend/.env` and `frontend/.env.local`; these files are ignored by Git.
- Production private values stay in GitHub Secrets and `/opt/ai-note-keeper/backend/.env` on the server.
- LLM and embedding provider API keys are not server-global configuration. Users configure their own keys in Settings.
- Deployments must go through GitHub Actions:
  1. Push code to GitHub.
  2. Run or wait for **Build Package**.
  3. Copy the package id from the build summary.
  4. Run **Deploy Package** with that package id.

## Files

- `common.backend.env`: non-secret backend defaults shared by local and production.
- `local.backend.env.example`: local backend private template.
- `local.frontend.env.example`: local frontend private template.
- `production.backend.env.example`: production backend private template for GitHub Secrets or server `.env`.
- `production.frontend.env`: production frontend public build-time values.
