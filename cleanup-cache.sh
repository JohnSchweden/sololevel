#!/bin/bash
# Cache cleanup script - frees ~20GB+ of regenerable cache data
# Run with: bash cleanup-cache.sh

set -e

echo "🧹 Starting cache cleanup..."
echo ""

# Track space before
BEFORE=$(df -h ~ | tail -1 | awk '{print $4}')

# 1. Yarn cache (899M)
echo "Cleaning Yarn cache (899M)..."
yarn cache clean --all 2>/dev/null || echo "  ⚠️  Yarn cache clean failed (may need to be in project directory)"
# Also clean Yarn Berry global cache
rm -rf ~/.yarn/berry/cache 2>/dev/null || true

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

# 10. npm cache (530M)
echo "Cleaning npm cache (530M)..."
npm cache clean --force 2>/dev/null || echo "  ⚠️  npm cache clean failed"
rm -rf ~/.npm/_npx 2>/dev/null || true

# 11. Gradle cache (6.7GB) - LARGE
echo "Cleaning Gradle cache (6.7GB)..."
rm -rf ~/.gradle/caches

# 12. Rust/Cargo caches
echo "Cleaning Rust/Cargo caches..."
rm -rf ~/.cargo/registry/cache 2>/dev/null || true
# Note: Rustup toolchains are kept (only cache is removed)

# 13. Firefox cache (138M)
echo "Cleaning Firefox cache (138M)..."
rm -rf ~/Library/Caches/Firefox 2>/dev/null || true
rm -rf ~/Library/Application\ Support/Firefox/Profiles/*/cache2 2>/dev/null || true

# 14. Siri TTS cache (223M)
echo "Cleaning Siri TTS cache (223M)..."
rm -rf ~/Library/Caches/SiriTTS 2>/dev/null || true

# Track space after
AFTER=$(df -h ~ | tail -1 | awk '{print $4}')

echo ""
echo "✅ Cleanup complete!"
echo "📊 Space before: $BEFORE"
echo "📊 Space after:  $AFTER"
echo ""
echo "💡 Note: Caches will regenerate as you use these tools."
echo "   Spotify will re-download music, browsers will rebuild cache, etc."

















