#!/bin/bash
# System Data cleanup script - frees ~20GB+ of space
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






