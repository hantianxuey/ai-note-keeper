#!/usr/bin/env bash

# AI Note Keeper - Alibaba Cloud Linux one-time ECS setup.
# Run on the ECS instance before the first GitHub Actions deployment.

set -euo pipefail

APP_PATH="${APP_PATH:-/opt/ai-note-keeper}"
SERVER_NAME="${SERVER_NAME:-8.136.39.247}"
NODE_VERSION="${NODE_VERSION:-20}"
APP_USER="${APP_USER:-root}"
NGINX_SITE_FILE="/etc/nginx/conf.d/ai-note-keeper.conf"

if [ "$(id -u)" -ne 0 ]; then
  echo "Please run this script as root or with sudo."
  exit 1
fi

if [ ! -f /etc/os-release ]; then
  echo "Cannot detect OS. This script only supports Alibaba Cloud Linux."
  exit 1
fi

# shellcheck disable=SC1091
. /etc/os-release

if [ "${ID:-}" != "alinux" ]; then
  echo "Unsupported OS: ${PRETTY_NAME:-unknown}. This script only supports Alibaba Cloud Linux."
  exit 1
fi

if command -v dnf >/dev/null 2>&1; then
  PKG_MANAGER="dnf"
else
  PKG_MANAGER="yum"
fi

echo "==> Installing system dependencies"
"${PKG_MANAGER}" install -y ca-certificates curl gnupg2 nginx openssh-server tar gzip

echo "==> Installing Node.js ${NODE_VERSION}"
if ! command -v node >/dev/null 2>&1 || ! node --version | grep -q "^v${NODE_VERSION}\."; then
  curl -fsSL "https://rpm.nodesource.com/setup_${NODE_VERSION}.x" | bash -
  "${PKG_MANAGER}" install -y nodejs
fi

echo "==> Installing PM2"
npm install -g pm2
pm2 startup systemd -u "${APP_USER}" --hp "$(eval echo "~${APP_USER}")" || true

echo "==> Creating application directories"
mkdir -p "${APP_PATH}/releases" "${APP_PATH}/shared/logs" "${APP_PATH}/backend"
chown -R "${APP_USER}:${APP_USER}" "${APP_PATH}"

echo "==> Writing Nginx site"
cat > "${NGINX_SITE_FILE}" <<EOF
server {
    listen 80;
    server_name ${SERVER_NAME};

    location / {
        root ${APP_PATH}/frontend;
        try_files \$uri \$uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    location /health {
        proxy_pass http://127.0.0.1:3000/health;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript application/json;

    access_log /var/log/nginx/ai-note-keeper.access.log;
    error_log /var/log/nginx/ai-note-keeper.error.log;
}
EOF

nginx -t
systemctl enable nginx
systemctl restart nginx

echo "==> Enabling SSH service"
systemctl enable sshd
systemctl restart sshd

echo "==> Creating backend .env example if missing"
if [ ! -f "${APP_PATH}/backend/.env" ]; then
  cat > "${APP_PATH}/backend/.env" <<'EOF'
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/ainotes
JWT_SECRET=change-me-before-first-deploy
DEFAULT_LLM_PROVIDER=openai
DEFAULT_LLM_MODEL=gpt-3.5-turbo
EOF
  chown "${APP_USER}:${APP_USER}" "${APP_PATH}/backend/.env"
fi

echo "==> Done"
echo "Next:"
echo "1. Put production values in ${APP_PATH}/backend/.env"
echo "2. Add the GitHub repository secrets listed in DEPLOYMENT.md"
echo "3. Make sure the Aliyun security group allows TCP 22 and 80"
