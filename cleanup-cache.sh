#!/bin/bash
# Cache cleanup script - frees ~8.5GB of regenerable cache data
# Run with: bash cleanup-cache.sh

set -e

echo "🧹 Starting cache cleanup..."
echo ""

# Track space before
BEFORE=$(df -h ~ | tail -1 | awk '{print $4}')

# 1. Yarn cache (239M)
echo "Cleaning Yarn cache (239M)..."
yarn cache clean --all 2>/dev/null || echo "  ⚠️  Yarn cache clean failed (may need to be in project directory)"

# 2. TypeScript cache (432M)
echo "Cleaning TypeScript cache (432M)..."
rm -rf ~/Library/Caches/typescript

# 3. Playwright cache (479M)
echo "Cleaning Playwright cache (479M)..."
rm -rf ~/Library/Caches/ms-playwright

# 4. Deno cache (188M)
echo "Cleaning Deno cache (188M)..."
rm -rf ~/Library/Caches/deno

# 5. Browser caches (Arc: 1.1G, Google: 1.0G)
echo "Cleaning browser caches (Arc: 1.1G, Google: 1.0G)..."
rm -rf ~/Library/Caches/Arc
rm -rf ~/Library/Caches/Google

# 6. Spotify cache (4.1G) - LARGEST
echo "Cleaning Spotify cache (4.1G)..."
rm -rf ~/Library/Caches/com.spotify.client

# 7. UV cache (929M)
echo "Cleaning UV cache (929M)..."
rm -rf ~/.cache/uv

# 8. Node cache (51M)
echo "Cleaning Node cache (51M)..."
rm -rf ~/.cache/node

# 9. Selenium cache (16M)
echo "Cleaning Selenium cache (16M)..."
rm -rf ~/.cache/selenium

# Track space after
AFTER=$(df -h ~ | tail -1 | awk '{print $4}')

echo ""
echo "✅ Cleanup complete!"
echo "📊 Space before: $BEFORE"
echo "📊 Space after:  $AFTER"
echo ""
echo "💡 Note: Caches will regenerate as you use these tools."
echo "   Spotify will re-download music, browsers will rebuild cache, etc."
