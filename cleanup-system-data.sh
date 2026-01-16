#!/bin/bash
# System Data cleanup script - frees ~30GB+ of space
# Run with: bash cleanup-system-data.sh

set -e

echo "🧹 Starting System Data cleanup..."
echo ""

# Track space before
BEFORE=$(df -h ~ | tail -1 | awk '{print $4}')

# 1. Cursor state database (17GB) - Safe to delete, will recreate
echo "Cleaning Cursor state database (17GB)..."
rm -f ~/Library/Application\ Support/Cursor/User/globalStorage/state.vscdb.backup
echo "  ⚠️  Note: state.vscdb (8.6GB) is actively used. Close Cursor and delete manually if needed."

# 2. Cursor caches (~2GB total)
echo "Cleaning Cursor caches (~2GB)..."
rm -rf ~/Library/Application\ Support/Cursor/CachedData
rm -rf ~/Library/Application\ Support/Cursor/Partitions/*/Cache
rm -rf ~/Library/Application\ Support/Cursor/Partitions/*/Code\ Cache
rm -rf ~/Library/Application\ Support/Cursor/WebStorage/*/CacheStorage
rm -rf ~/Library/Application\ Support/Cursor/GPUCache
rm -rf ~/Library/Application\ Support/Cursor/DawnGraphiteCache
rm -rf ~/Library/Application\ Support/Cursor/DawnWebGPUCache

# 3. Cursor logs (65M)
echo "Cleaning Cursor logs (65M)..."
rm -rf ~/Library/Application\ Support/Cursor/logs/*

# 4. Cursor History (349M) - Safe, just file edit history
echo "Cleaning Cursor History (349M)..."
rm -rf ~/Library/Application\ Support/Cursor/User/History/*

# 5. iOS Simulator devices (16GB) - Delete unused simulators
echo "Cleaning iOS Simulators (16GB)..."
echo "  Listing available simulators..."
xcrun simctl list devices | grep -E "Shutdown" | head -5
echo "  ⚠️  Run 'xcrun simctl delete all' to delete ALL simulators (will need to recreate)"
echo "  Or delete specific ones: 'xcrun simctl delete <device-id>'"

# 6. Spotify PersistentCache (782M)
echo "Cleaning Spotify PersistentCache (782M)..."
rm -rf ~/Library/Application\ Support/Spotify/PersistentCache

# 7. System logs (44M)
echo "Cleaning system logs (44M)..."
sudo rm -rf ~/Library/Logs/* 2>/dev/null || echo "  ⚠️  Some logs require sudo or are in use"

# 8. Browser Application Support caches
echo "Cleaning browser Application Support caches..."
rm -rf ~/Library/Application\ Support/Arc/Cache
rm -rf ~/Library/Application\ Support/Google/Chrome/Default/Cache
rm -rf ~/Library/Application\ Support/Google/Chrome/Default/Code\ Cache
rm -rf ~/Library/Caches/Firefox
rm -rf ~/Library/Application\ Support/Firefox/Profiles/*/cache2

# 9. npm cache (530M)
echo "Cleaning npm cache (530M)..."
npm cache clean --force 2>/dev/null || echo "  ⚠️  npm cache clean failed"
rm -rf ~/.npm/_npx 2>/dev/null || true

# 10. Gradle cache (6.7GB) - LARGE
echo "Cleaning Gradle cache (6.7GB)..."
rm -rf ~/.gradle/caches

# 11. Rust/Cargo caches
echo "Cleaning Rust/Cargo caches..."
rm -rf ~/.cargo/registry/cache 2>/dev/null || true

# 12. Xcode Documentation Cache (526MB)
echo "Cleaning Xcode Documentation Cache (526MB)..."
rm -rf ~/Library/Developer/Xcode/DocumentationCache

# 13. Siri TTS cache (223M)
echo "Cleaning Siri TTS cache (223M)..."
rm -rf ~/Library/Caches/SiriTTS

# 14. Homebrew cache (35MB)
echo "Cleaning Homebrew cache (35MB)..."
brew cleanup -s 2>/dev/null || echo "  ⚠️  Homebrew cleanup failed"

# 15. Trash (70MB)
echo "Emptying Trash (70MB)..."
rm -rf ~/.Trash/*

# 16. System temp files (87MB)
echo "Cleaning system temp files (87MB)..."
rm -rf /private/var/folders/*/*/C/com.apple.* 2>/dev/null || true
rm -rf /private/var/folders/*/*/C/*.tmp 2>/dev/null || true

# Track space after
AFTER=$(df -h ~ | tail -1 | awk '{print $4}')

echo ""
echo "✅ Cleanup complete!"
echo "📊 Space before: $BEFORE"
echo "📊 Space after:  $AFTER"
echo ""
echo "💡 Remaining large items:"
echo "   - Cursor state.vscdb (8.6GB) - Close Cursor and delete manually"
echo "   - iOS Simulators (16GB) - Delete unused ones with: xcrun simctl delete <device-id>"
echo ""
echo "⚠️  To delete Cursor state.vscdb (8.6GB):"
echo "   1. Close Cursor completely"
echo "   2. Run: rm ~/Library/Application\\ Support/Cursor/User/globalStorage/state.vscdb"
echo "   3. Restart Cursor (will recreate empty database)"

















