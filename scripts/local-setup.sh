#!/usr/bin/env sh
set -eu

# AreaIQ Local Setup Script
# This script provides a 'one-command' experience to start the local test environment.

echo "🚀 Starting AreaIQ Local Test Environment..."

# 1. Environment Variable Setup
if [ ! -f .env.local.test ]; then
  echo "📝 Creating .env.local.test from example..."
  cp .env.local.test.example .env.local.test
fi

# 2. Start Containers
echo "🐳 Bringing up containers..."
./scripts/runtime-up.sh

# 3. Wait for Database
echo "⏳ Waiting for database to be ready..."
# Use runtime-db-health.sh if it exists, or just wait a bit
if [ -f ./scripts/runtime-db-health.sh ]; then
  ./scripts/runtime-db-health.sh
else
  sleep 5
fi

# 4. Success Message
echo "===================================================="
echo "✅ Local Test Environment is UP!"
echo ""
echo "📱 App: http://localhost:3000"
echo "📧 Email Mock (MailHog): http://localhost:8025"
echo "🗄️  Database (Postgres): localhost:55432"
echo "🔗 Database Proxy (Neon): localhost:55433"
echo "🤖 AI Mock: localhost:55434"
echo "🌐 API Mock (Prism): http://localhost:4010"
echo ""
echo "💡 Use './scripts/runtime-down.sh' to stop."
echo "💡 Use './scripts/runtime-reset.sh' to wipe the DB."
echo "===================================================="
