#!/usr/bin/env bash
set -e

# ==============================================================================
# deploy_release.sh - Deployment script for Lerntoolbox
# ==============================================================================

PROJECT_NAME="lerntoolbox"
DB_NAME="lerntoolbox-db"

echo "=========================================="
echo "🚀 Lerntoolbox Release Deployment"
echo "=========================================="

# Check for wrangler
if command -v wrangler &> /dev/null; then
    WRANGLER_CMD="wrangler"
elif command -v npx &> /dev/null; then
    WRANGLER_CMD="npx wrangler"
else
    echo "❌ Error: Neither 'wrangler' nor 'npx' was found."
    exit 1
fi

# Optional database migration argument
if [ "$1" == "--migrate-db" ] || [ "$1" == "-m" ]; then
    echo "📦 Applying D1 database migrations (schema.sql)..."
    $WRANGLER_CMD d1 execute "$DB_NAME" --file=./schema.sql --remote
    echo "✅ Database migration complete."
fi

echo "🌐 Deploying to Cloudflare Pages ($PROJECT_NAME)..."
$WRANGLER_CMD pages deploy . --project-name "$PROJECT_NAME"

echo ""
echo "=========================================="
echo "✅ Deployment completed successfully!"
echo "🔗 Production URL: https://lerntoolbox.mrgoldsmitt.work"
echo "=========================================="
