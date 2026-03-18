#!/bin/bash
# ──────────────────────────────────────────────────
# NāM Events — VPS Initial Setup Script
# Run this ONCE on a fresh VPS to set up everything
# ──────────────────────────────────────────────────

set -euo pipefail

DOMAIN="${1:-events.nam.space}"
APP_DIR="/opt/namevents"

echo "🏗️  Setting up NāM Events on this server..."
echo "   Domain: $DOMAIN"
echo ""

# --- Install Docker ---
if ! command -v docker &> /dev/null; then
  echo "📦 Installing Docker..."
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
  echo "✅ Docker installed"
else
  echo "✅ Docker already installed"
fi

# --- Install Docker Compose plugin ---
if ! docker compose version &> /dev/null; then
  echo "📦 Installing Docker Compose..."
  apt-get update && apt-get install -y docker-compose-plugin
  echo "✅ Docker Compose installed"
else
  echo "✅ Docker Compose already installed"
fi

# --- Create app directory ---
echo "📁 Setting up $APP_DIR..."
mkdir -p "$APP_DIR"
cd "$APP_DIR"

# --- Copy docker-compose if not exists ---
if [ ! -f docker-compose.prod.yml ]; then
  echo "⚠️  Copy docker-compose.prod.yml to $APP_DIR"
  echo "   Run: scp docker-compose.prod.yml root@your-server:$APP_DIR/"
fi

# --- Create .env.production if not exists ---
if [ ! -f .env.production ]; then
  echo ""
  echo "📝 Creating .env.production..."

  AUTH_SECRET=$(openssl rand -hex 32)
  DB_PASSWORD=$(openssl rand -hex 16)

  cat > .env.production << EOF
# Database
DATABASE_URL="postgresql://namevents:${DB_PASSWORD}@db:5432/nam_events?schema=public"
POSTGRES_USER=namevents
POSTGRES_PASSWORD=${DB_PASSWORD}
POSTGRES_DB=nam_events

# Auth
ADMIN_EMAIL=alex@nam.space
ADMIN_PASSWORD=CHANGE_ME_NOW
AUTH_SECRET=${AUTH_SECRET}

# App
NEXT_PUBLIC_APP_URL=https://${DOMAIN}

# OpenAI
OPENAI_API_KEY=

EOF

  echo "✅ .env.production created with generated secrets"
  echo "⚠️  IMPORTANT: Edit .env.production to set:"
  echo "   - ADMIN_PASSWORD (change from default)"
  echo "   - OPENAI_API_KEY (for AI features)"
fi

# --- Install Nginx ---
if ! command -v nginx &> /dev/null; then
  echo "📦 Installing Nginx..."
  apt-get update && apt-get install -y nginx
  systemctl enable nginx
  echo "✅ Nginx installed"
else
  echo "✅ Nginx already installed"
fi

# --- Configure Nginx ---
echo "🌐 Configuring Nginx for $DOMAIN..."
cat > /etc/nginx/sites-available/namevents << EOF
server {
    listen 80;
    server_name ${DOMAIN};

    client_max_body_size 10M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

ln -sf /etc/nginx/sites-available/namevents /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
echo "✅ Nginx configured"

# --- SSL with Certbot ---
if ! command -v certbot &> /dev/null; then
  echo "🔒 Installing Certbot for SSL..."
  apt-get install -y certbot python3-certbot-nginx
fi

echo ""
echo "🔒 To enable HTTPS, run:"
echo "   certbot --nginx -d $DOMAIN"
echo ""

echo "──────────────────────────────────────"
echo "✅ VPS setup complete!"
echo ""
echo "Next steps:"
echo "  1. Edit $APP_DIR/.env.production (set passwords + API keys)"
echo "  2. Copy docker-compose.prod.yml to $APP_DIR/"
echo "  3. Set GitHub Secrets in your repo:"
echo "     - VPS_HOST (your server IP)"
echo "     - VPS_USER (root or deploy user)"
echo "     - VPS_SSH_KEY (private SSH key)"
echo "  4. Push to main → GitHub Actions will build & deploy"
echo "  5. Run: certbot --nginx -d $DOMAIN"
echo "──────────────────────────────────────"
