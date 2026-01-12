# Storage Cleanup Guide

Quick reference for freeing up disk space from development tools, Docker, and simulators.

## Quick Start

Run the master cleanup script:
```bash
bash cleanup-all.sh
```

This interactive script will guide you through cleaning:
- Docker containers, images, volumes, build cache
- Android emulator AVDs and system images
- iOS simulator devices
- Cursor caches and state
- Development tool caches
- Browser caches

## Individual Cleanup Scripts

### 1. Cache Cleanup (~8.5GB)
```bash
bash cleanup-cache.sh
```
Cleans: Yarn, TypeScript, Playwright, Deno, Node, browser caches, Spotify cache

### 2. System Data Cleanup (~20GB+)
```bash
bash cleanup-system-data.sh
```
Cleans: Cursor state/caches/logs, iOS simulators, system logs, browser Application Support caches

### 3. Docker Cleanup (varies, often 5-20GB)
```bash
yarn workspace @my/supabase-functions cleanup-docker
# OR
node scripts/supabase/cleanup-docker.mjs
```
Interactive menu for:
- Removing unused Supabase images
- Removing unused volumes
- Removing build cache
- Removing stopped containers
- Full system prune

## Manual Cleanup Commands

### Docker
```bash
# See current usage
docker system df

# Remove all unused resources (aggressive)
docker system prune -a -f --volumes

# Remove only stopped containers
docker container prune -f

# Remove unused images
docker image prune -a -f

# Remove unused volumes (careful - may delete data)
docker volume prune -f

# Remove build cache
docker builder prune -a -f
```

### Android Emulators
```bash
# List AVDs
emulator -list-avds

# Delete specific AVD
rm -rf ~/.android/avd/<avd-name>.avd

# Delete system images (check size first)
du -sh ~/Library/Android/sdk/system-images/*
rm -rf ~/Library/Android/sdk/system-images/<api-level>/<abi>

# Or use Android Studio:
# Tools → Device Manager → Delete device
```

### iOS Simulators
```bash
# List all simulators
xcrun simctl list devices

# Delete all unavailable/shutdown simulators
xcrun simctl delete unavailable

# Delete specific simulator
xcrun simctl delete <device-id>

# Clean Xcode DerivedData
rm -rf ~/Library/Developer/Xcode/DerivedData/*
```

### Cursor
```bash
# Clean caches (safe, regenerates)
rm -rf ~/Library/Application\ Support/Cursor/CachedData
rm -rf ~/Library/Application\ Support/Cursor/Partitions/*/Cache
rm -rf ~/Library/Application\ Support/Cursor/logs/*

# Delete state database (CLOSE CURSOR FIRST)
# This is 8-17GB but contains your workspace state
rm ~/Library/Application\ Support/Cursor/User/globalStorage/state.vscdb
```

### Development Caches
```bash
# Yarn
yarn cache clean --all

# TypeScript
rm -rf ~/Library/Caches/typescript

# Playwright
rm -rf ~/Library/Caches/ms-playwright

# Deno
rm -rf ~/Library/Caches/deno

# Node
rm -rf ~/.cache/node
```

## Storage Analysis

Find what's taking up space:

```bash
# Home directory breakdown
du -sh ~/* | sort -hr | head -20

# Docker usage
docker system df

# iOS simulators
xcrun simctl list devices | grep -E "Shutdown"

# Android AVDs
du -sh ~/.android/avd/*

# Cursor
du -sh ~/Library/Application\ Support/Cursor/*

# Development caches
du -sh ~/Library/Caches/* | sort -hr
```

## Typical Space Savings

| Cleanup Type | Typical Savings | Regenerates? |
|--------------|-----------------|--------------|
| Docker system prune | 5-20GB | Yes (images) |
| Android AVDs | 2-10GB per AVD | Yes (recreate) |
| iOS Simulators | 1-3GB per device | Yes (recreate) |
| Cursor state.vscdb | 8-17GB | Yes (recreates empty) |
| Cursor caches | 2-5GB | Yes |
| Spotify cache | 4-8GB | Yes (re-downloads) |
| Browser caches | 1-3GB | Yes |
| Development caches | 1-2GB | Yes |

## Best Practices

1. **Run cleanup monthly** - Use `cleanup-all.sh` for regular maintenance
2. **Keep only active simulators** - Delete unused iOS/Android devices
3. **Docker cleanup** - Run after major version updates or when switching projects
4. **Cursor state** - Only delete `state.vscdb` if you're desperate (loses workspace state)
5. **Android system images** - Keep only the API levels you test against
6. **Monitor regularly** - Use `du -sh` commands to track growth

## Emergency Cleanup (Maximum Space)

If you're critically low on space:

```bash
# 1. Docker nuclear option
docker system prune -a -f --volumes

# 2. Delete all iOS simulators (recreate as needed)
xcrun simctl delete unavailable
xcrun simctl erase all

# 3. Delete all Android AVDs (recreate in Android Studio)
rm -rf ~/.android/avd/*

# 4. Clean all caches
bash cleanup-cache.sh
bash cleanup-system-data.sh

# 5. Cursor state (CLOSE CURSOR FIRST)
rm ~/Library/Application\ Support/Cursor/User/globalStorage/state.vscdb
```

## Troubleshooting

**"Permission denied" errors:**
- Some files require closing the app first (Cursor, Docker containers)
- Use `sudo` only for system logs (be careful)

**Docker cleanup fails:**
- Ensure Docker Desktop is running
- Stop all containers first: `docker stop $(docker ps -q)`

**Simulator cleanup fails:**
- Close Xcode and Simulator app
- Ensure no simulators are running

**Cursor cleanup fails:**
- Close Cursor completely
- Wait a few seconds for file locks to release
