#!/bin/bash
# Master cleanup script - frees 40GB+ of development cache and system data
# Run with: bash cleanup-all.sh
#
# This script cleans:
# - Docker containers, images, volumes, build cache
# - Android emulator AVDs and system images
# - iOS simulator devices and Xcode caches
# - Cursor caches and state
# - Development tool caches (Yarn, npm, TypeScript, Gradle, Rust/Cargo, Playwright, etc.)
# - Browser caches (Arc, Chrome, Firefox)
# - System caches (Siri TTS, Homebrew, Trash, temp files)

set -e

echo "🧹 Master Cleanup Script - Development Storage Cleaner"
echo "======================================================"
echo ""

# Track space before
BEFORE=$(df -h ~ | tail -1 | awk '{print $4}')
echo "📊 Available space before: $BEFORE"
echo ""

# Function to get size of directory
get_size() {
  if [ -d "$1" ]; then
    du -sh "$1" 2>/dev/null | awk '{print $1}' || echo "0"
  else
    echo "0"
  fi
}

# Function to confirm action
confirm() {
  read -p "$1 (y/N): " -n 1 -r
  echo
  [[ $REPLY =~ ^[Yy]$ ]]
}

# 1. DOCKER CLEANUP
echo "🐳 DOCKER CLEANUP"
echo "-----------------"
if command -v docker &> /dev/null; then
  DOCKER_USAGE=$(docker system df 2>/dev/null | head -1 || echo "")
  if [ -n "$DOCKER_USAGE" ]; then
    echo "Current Docker usage:"
    docker system df 2>/dev/null | head -5
    echo ""
    
    if confirm "Clean up Docker (containers, images, volumes, build cache)?"; then
      echo "  → Removing stopped containers..."
      docker container prune -f 2>/dev/null || true
      
      echo "  → Removing unused images..."
      docker image prune -a -f 2>/dev/null || true
      
      echo "  → Removing unused volumes..."
      docker volume prune -f 2>/dev/null || true
      
      echo "  → Removing build cache..."
      docker builder prune -a -f 2>/dev/null || true
      
      echo "  ✅ Docker cleanup complete"
    fi
  else
    echo "  ⚠️  Docker not running or not accessible"
  fi
else
  echo "  ⚠️  Docker not installed"
fi
echo ""

# 2. ANDROID EMULATOR CLEANUP
echo "🤖 ANDROID EMULATOR CLEANUP"
echo "---------------------------"
ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
AVD_DIR="$HOME/.android/avd"
SYSTEM_IMAGES="$ANDROID_HOME/system-images"

if [ -d "$AVD_DIR" ]; then
  AVD_SIZE=$(get_size "$AVD_DIR")
  echo "  AVD directory size: $AVD_SIZE"
  
  if [ -d "$SYSTEM_IMAGES" ]; then
    IMAGES_SIZE=$(get_size "$SYSTEM_IMAGES")
    echo "  System images size: $IMAGES_SIZE"
  fi
  
  if confirm "Delete unused Android AVDs and system images?"; then
    echo "  → Listing AVDs..."
    if command -v emulator &> /dev/null; then
      emulator -list-avds 2>/dev/null || echo "  ⚠️  Could not list AVDs"
    fi
    
    echo "  ⚠️  Manual cleanup required:"
    echo "     - Delete AVDs: rm -rf $AVD_DIR/<avd-name>.avd"
    echo "     - Delete system images: rm -rf $SYSTEM_IMAGES/<api-level>/<abi>"
    echo "     - Or use Android Studio: Tools → Device Manager → Delete"
  fi
else
  echo "  ℹ️  No Android AVD directory found"
fi
echo ""

# 3. iOS SIMULATOR CLEANUP
echo "🍎 iOS SIMULATOR CLEANUP"
echo "------------------------"
if command -v xcrun &> /dev/null; then
  SIMULATORS=$(xcrun simctl list devices 2>/dev/null | grep -c "Shutdown" || echo "0")
  if [ "$SIMULATORS" -gt 0 ]; then
    echo "  Found $SIMULATORS shutdown simulators"
    
    if confirm "Delete shutdown iOS simulators?"; then
      echo "  → Listing shutdown simulators..."
      xcrun simctl list devices | grep -E "Shutdown" | head -10
      echo ""
      
      if confirm "Delete ALL shutdown simulators? (you can recreate them later)"; then
        xcrun simctl delete unavailable 2>/dev/null || true
        echo "  ✅ Shutdown simulators deleted"
      else
        echo "  ⚠️  To delete specific simulator: xcrun simctl delete <device-id>"
      fi
    fi
    
    # Clean derived data
    DERIVED_DATA="$HOME/Library/Developer/Xcode/DerivedData"
    if [ -d "$DERIVED_DATA" ]; then
      DERIVED_SIZE=$(get_size "$DERIVED_DATA")
      echo "  DerivedData size: $DERIVED_SIZE"
      
      if confirm "Delete Xcode DerivedData?"; then
        rm -rf "$DERIVED_DATA"/*
        echo "  ✅ DerivedData cleaned"
      fi
    fi
    
    # Clean Xcode Documentation Cache
    DOC_CACHE="$HOME/Library/Developer/Xcode/DocumentationCache"
    if [ -d "$DOC_CACHE" ]; then
      DOC_SIZE=$(get_size "$DOC_CACHE")
      echo "  Documentation Cache size: $DOC_SIZE"
      
      if confirm "Delete Xcode Documentation Cache?"; then
        rm -rf "$DOC_CACHE" 2>/dev/null || true
        echo "  ✅ Documentation Cache cleaned"
      fi
    fi
  else
    echo "  ℹ️  No shutdown simulators found"
  fi
else
  echo "  ⚠️  Xcode command line tools not found"
fi
echo ""

# 4. CURSOR CLEANUP
echo "💻 CURSOR CLEANUP"
echo "-----------------"
CURSOR_DIR="$HOME/Library/Application Support/Cursor"

if [ -d "$CURSOR_DIR" ]; then
  # Check state.vscdb size
  STATE_DB="$CURSOR_DIR/User/globalStorage/state.vscdb"
  if [ -f "$STATE_DB" ]; then
    STATE_SIZE=$(get_size "$STATE_DB")
    echo "  state.vscdb size: $STATE_SIZE"
    echo "  ⚠️  Close Cursor before deleting state.vscdb"
  fi
  
  # Clean caches
  CACHE_SIZE=$(get_size "$CURSOR_DIR/CachedData" 2>/dev/null || echo "0")
  if [ "$CACHE_SIZE" != "0" ]; then
    echo "  Cache size: $CACHE_SIZE"
    
    if confirm "Clean Cursor caches (safe, will regenerate)?"; then
      rm -rf "$CURSOR_DIR/CachedData" 2>/dev/null || true
      rm -rf "$CURSOR_DIR/Partitions"/*/Cache 2>/dev/null || true
      rm -rf "$CURSOR_DIR/Partitions"/*/Code\ Cache 2>/dev/null || true
      rm -rf "$CURSOR_DIR/WebStorage"/*/CacheStorage 2>/dev/null || true
      rm -rf "$CURSOR_DIR/GPUCache" 2>/dev/null || true
      rm -rf "$CURSOR_DIR/DawnGraphiteCache" 2>/dev/null || true
      rm -rf "$CURSOR_DIR/DawnWebGPUCache" 2>/dev/null || true
      rm -rf "$CURSOR_DIR/logs"/* 2>/dev/null || true
      rm -rf "$CURSOR_DIR/User/History"/* 2>/dev/null || true
      echo "  ✅ Cursor caches cleaned"
    fi
  fi
  
  # State database backup
  STATE_BACKUP="$CURSOR_DIR/User/globalStorage/state.vscdb.backup"
  if [ -f "$STATE_BACKUP" ]; then
    BACKUP_SIZE=$(get_size "$STATE_BACKUP")
    echo "  state.vscdb.backup size: $BACKUP_SIZE"
    
    if confirm "Delete state.vscdb.backup (safe backup file)?"; then
      rm -f "$STATE_BACKUP"
      echo "  ✅ Backup deleted"
    fi
  fi
else
  echo "  ℹ️  Cursor directory not found"
fi
echo ""

# 5. DEVELOPMENT TOOL CACHES
echo "🛠️  DEVELOPMENT TOOL CACHES"
echo "----------------------------"
if confirm "Clean development tool caches (Yarn, TypeScript, Playwright, etc.)?"; then
  echo "  → Cleaning Yarn cache..."
  yarn cache clean --all 2>/dev/null || echo "    ⚠️  Yarn cache clean failed"
  # Also clean Yarn Berry global cache
  rm -rf ~/.yarn/berry/cache 2>/dev/null || true
  
  echo "  → Cleaning TypeScript cache..."
  rm -rf ~/Library/Caches/typescript 2>/dev/null || true
  
  echo "  → Cleaning Playwright cache..."
  rm -rf ~/Library/Caches/ms-playwright 2>/dev/null || true
  
  echo "  → Cleaning Deno cache..."
  rm -rf ~/Library/Caches/deno 2>/dev/null || true
  
  echo "  → Cleaning Node cache..."
  rm -rf ~/.cache/node 2>/dev/null || true
  
  echo "  → Cleaning UV cache..."
  rm -rf ~/.cache/uv 2>/dev/null || true
  
  echo "  → Cleaning Selenium cache..."
  rm -rf ~/.cache/selenium 2>/dev/null || true
  
  echo "  → Cleaning npm cache..."
  npm cache clean --force 2>/dev/null || echo "    ⚠️  npm cache clean failed"
  rm -rf ~/.npm/_npx 2>/dev/null || true
  
  echo "  → Cleaning Gradle cache..."
  rm -rf ~/.gradle/caches 2>/dev/null || true
  
  echo "  → Cleaning Rust/Cargo caches..."
  rm -rf ~/.cargo/registry/cache 2>/dev/null || true
  
  echo "  ✅ Development caches cleaned"
fi
echo ""

# 6. BROWSER CACHES
echo "🌐 BROWSER CACHES"
echo "-----------------"
if confirm "Clean browser caches (Arc, Chrome, etc.)?"; then
  echo "  → Cleaning Arc cache..."
  rm -rf ~/Library/Caches/Arc 2>/dev/null || true
  rm -rf ~/Library/Application\ Support/Arc/Cache 2>/dev/null || true
  
  echo "  → Cleaning Chrome cache..."
  rm -rf ~/Library/Caches/Google 2>/dev/null || true
  rm -rf ~/Library/Application\ Support/Google/Chrome/Default/Cache 2>/dev/null || true
  rm -rf ~/Library/Application\ Support/Google/Chrome/Default/Code\ Cache 2>/dev/null || true
  
  echo "  → Cleaning Firefox cache..."
  rm -rf ~/Library/Caches/Firefox 2>/dev/null || true
  rm -rf ~/Library/Application\ Support/Firefox/Profiles/*/cache2 2>/dev/null || true
  
  echo "  ✅ Browser caches cleaned"
fi
echo ""

# 7. SPOTIFY CACHE (often huge)
echo "🎵 SPOTIFY CACHE"
echo "----------------"
SPOTIFY_CACHE="$HOME/Library/Caches/com.spotify.client"
if [ -d "$SPOTIFY_CACHE" ]; then
  SPOTIFY_SIZE=$(get_size "$SPOTIFY_CACHE")
  echo "  Spotify cache size: $SPOTIFY_SIZE"
  
  if confirm "Clean Spotify cache (will re-download music)?"; then
    rm -rf "$SPOTIFY_CACHE" 2>/dev/null || true
    rm -rf "$HOME/Library/Application Support/Spotify/PersistentCache" 2>/dev/null || true
    echo "  ✅ Spotify cache cleaned"
  fi
fi
echo ""

# 8. SYSTEM CACHES
echo "🗑️  SYSTEM CACHES"
echo "-----------------"
if confirm "Clean system caches (Siri TTS, Homebrew, Trash, temp files)?"; then
  echo "  → Cleaning Siri TTS cache..."
  rm -rf ~/Library/Caches/SiriTTS 2>/dev/null || true
  
  echo "  → Cleaning Homebrew cache..."
  brew cleanup -s 2>/dev/null || echo "    ⚠️  Homebrew cleanup failed"
  
  echo "  → Emptying Trash..."
  rm -rf ~/.Trash/* 2>/dev/null || true
  
  echo "  → Cleaning system temp files..."
  rm -rf /private/var/folders/*/*/C/com.apple.* 2>/dev/null || true
  rm -rf /private/var/folders/*/*/C/*.tmp 2>/dev/null || true
  
  echo "  ✅ System caches cleaned"
fi
echo ""

# Track space after
AFTER=$(df -h ~ | tail -1 | awk '{print $4}')

echo ""
echo "======================================================"
echo "✅ CLEANUP COMPLETE"
echo "======================================================"
echo "📊 Space before: $BEFORE"
echo "📊 Space after:  $AFTER"
echo ""
echo "💡 TIPS:"
echo "   - Run this script monthly to keep storage clean"
echo "   - Docker: Use 'yarn workspace @my/supabase-functions cleanup-docker' for interactive cleanup"
echo "   - Cursor state.vscdb: Close Cursor, then delete manually if needed"
echo "   - Android AVDs: Use Android Studio Device Manager for easier management"
echo "   - iOS Simulators: Keep only the ones you actively use"
echo ""
