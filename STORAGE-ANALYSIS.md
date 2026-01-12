# Storage Analysis - Real Numbers

**Generated:** $(date)

## Top 5 Largest Items (Can Be Removed)

| Rank | Item | Size | Safe to Delete? | Command |
|------|------|------|-----------------|---------|
| 1 | **Xcode DerivedData** | **13GB** | ✅ Yes (regenerates) | `rm -rf ~/Library/Developer/Xcode/DerivedData/*` |
| 2 | **Android AVDs** | **10GB** | ✅ Yes (recreate in Android Studio) | `rm -rf ~/.android/avd/<name>.avd` |
| 3 | **Cursor state.vscdb.backup** | **9.8GB** | ✅ Yes (backup file) | `rm ~/Library/Application\ Support/Cursor/User/globalStorage/state.vscdb.backup` |
| 4 | **Docker unused images** | **9.527GB** | ✅ Yes (94% reclaimable) | `docker image prune -a -f` |
| 5 | **iOS Simulators** | **5.9GB** | ✅ Yes (delete shutdown ones) | `xcrun simctl delete unavailable` |

**Total reclaimable from top 5: ~48GB**

## Detailed Breakdown

### Cursor (19.7GB total)
- `state.vscdb.backup`: **9.8GB** ✅ Safe to delete
- `state.vscdb`: **9.9GB** ⚠️ Active (close Cursor first)
- `CachedData`: 74MB
- `logs`: 78MB
- `History`: 50MB
- GPU caches: ~7MB

### Docker (10.1GB total, 9.527GB reclaimable)
- **Unused images**: 9.527GB (94% reclaimable) ✅
- Active containers: 4.8MB
- Active volumes: 1.899GB
- Build cache: 0B

**Largest Docker images:**
- postgres:17.4.1.048: 3.15GB
- studio:2025.12.09: 1.42GB
- storage-api:v1.33.0: 1.11GB
- logflare:1.27.0: 1.02GB
- edge-runtime:v1.68.4: 973MB

### Android Development (12.3GB total)
- **AVDs**: **10GB** ✅
- **System images**: **2.3GB** ✅

### iOS Development (18.9GB total)
- **Xcode DerivedData**: **13GB** ✅
- **iOS Simulators**: **5.9GB** ✅ (16 shutdown devices found)

### Browser Caches (2GB total)
- Arc: 1.0GB
- Chrome: 951MB

### Spotify (1.7GB total)
- Cache: 1.7GB
- PersistentCache: 39MB

### Development Tool Caches (1.1GB total)
- UV cache: 753MB
- TypeScript: 187MB
- Deno: 149MB
- Yarn: 0 (already clean)

## Quick Win Commands (Run These First)

```bash
# 1. Cursor backup (9.8GB) - INSTANT
rm ~/Library/Application\ Support/Cursor/User/globalStorage/state.vscdb.backup

# 2. Xcode DerivedData (13GB) - INSTANT
rm -rf ~/Library/Developer/Xcode/DerivedData/*

# 3. Docker unused images (9.5GB) - INSTANT
docker image prune -a -f

# 4. iOS shutdown simulators (5.9GB) - INSTANT
xcrun simctl delete unavailable

# 5. Spotify cache (1.7GB) - INSTANT
rm -rf ~/Library/Caches/com.spotify.client

# 6. Browser caches (2GB) - INSTANT
rm -rf ~/Library/Caches/Arc ~/Library/Caches/Google

# 7. Development caches (1.1GB) - INSTANT
rm -rf ~/Library/Caches/typescript ~/Library/Caches/deno ~/.cache/uv
```

**Total from quick wins: ~42GB**

## Android AVDs (10GB) - Manual Review Needed

List your AVDs to decide which to keep:
```bash
emulator -list-avds
du -sh ~/.android/avd/*
```

Delete specific AVD:
```bash
rm -rf ~/.android/avd/<avd-name>.avd
```

## Cursor Active State (9.9GB) - Requires Closing Cursor

If you need more space and can lose workspace state:
1. Close Cursor completely
2. `rm ~/Library/Application\ Support/Cursor/User/globalStorage/state.vscdb`
3. Restart Cursor (will recreate empty database)

## Summary

- **Easiest wins (no app closing): ~42GB**
- **With Cursor state deletion: ~52GB**
- **With Android AVD cleanup: ~62GB total**
