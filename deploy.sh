#!/bin/bash
# ──────────────────────────────────────
# NāM Events — Deploy Script
# Run on VPS: cd /var/www/namevents && bash deploy.sh
# ──────────────────────────────────────

set -euo pipefail

echo "🚀 Deploying NāM Events..."

# Pull latest code
git pull origin main

# Build and restart containers
docker compose -f docker-compose.prod.yml build --no-cache
docker compose -f docker-compose.prod.yml up -d --remove-orphans

# Wait for DB to be healthy
echo "⏳ Waiting for database..."
sleep 5

# Run migrations
docker compose -f docker-compose.prod.yml exec app npx prisma migrate deploy

# Clean up
docker image prune -f

echo "✅ Deployed successfully!"
echo "   App running on http://127.0.0.1:3003"
