# Investigation: Audio Playback Failure After Task 32 RPC Fix

## Date: 2025-10-21
## Status: ROOT CAUSE IDENTIFIED

## Terminal Evidence

```
795| INFO [audioService] Generating signed URL from storage_path (RPC)
     storagePath=fd897ffc.../videos/20251021/89/audio/108/0.wav

797| WARN [audioService] Failed to generate signed URL, falling back to audio_url

798| INFO [audioService] Using legacy audio_url (RPC)

801| DEBUG [AudioPlayer] Normalized kong:8000 URL for dev environment
     originalUrl=http://kong:8000/storage/v1/object/sign/processed/...
     normalizedUrl=http://127.0.0.1:54321/storage/v1/object/sign/proc...

822| ERROR [AudioPlayer] Video component onError
     error: { code: -1008, domain: "NSURLErrorDomain", 
              localizedDescription: "resource unavailable" }
```

## Root Cause Analysis

### Issue 1: Historical Audio Files (PRIMARY)

**Problem:**
- Audio files generated BEFORE Task 32 completion have `storage_path` values in database
- BUT files don't physically exist at those new semantic paths
- They exist at OLD paths (timestamp-based) referenced by `audio_url`

**Timeline:**
1. Audio generated for feedback 108/109 → stored at OLD path
2. Task 32 Module 1 applied → `storage_path` column added (NULL for existing rows)
3. Task 32 Module 4 deployed → Audio worker stores NEW semantic paths
4. **Gap**: Existing audio files NOT migrated to new paths
5. RPC fix applied → RPC now returns `storage_path` (populated by worker)
6. Client tries to generate signed URL from `storage_path` → **file doesn't exist** → fails
7. Falls back to `audio_url` → triggers Issue 2

**Evidence:**
- Line 795: `storage_path=.../videos/20251021/89/audio/108/0.wav` (new semantic path)
- Line 797: "Failed to generate signed URL" (file doesn't exist at that path)
- Line 798: Falls back to `audio_url` (old path where file actually exists)

**Why storage_path has a value:**
The audio worker (Module 4) STORES the semantic path in the database even for historical records, but it doesn't MOVE the physical files from old locations to new locations.

### Issue 2: Local Development Network Access (SECONDARY)

**Problem:**
- iOS Simulator cannot access Supabase Storage at `kong:8000` or `127.0.0.1:54321`
- Network isolation between simulator and Docker containers

**Evidence:**
- Line 801: URL normalization from `kong:8000` → `127.0.0.1:54321`
- Line 822: NSURLErrorDomain -1008 "resource unavailable"

**This is a development environment issue**, not a production issue.

## Impact Assessment

| Scenario | Audio Source | Works? | Reason |
|----------|--------------|--------|--------|
| **Historical** audio (before Task 32) | `storage_path` (new) | ❌ NO | File doesn't exist at new path |
| **Historical** audio (before Task 32) | `audio_url` fallback | ❌ NO (dev only) | iOS simulator network isolation |
| **New** audio (after Task 32 complete) | `storage_path` (new) | ✅ YES (prod) / ❌ NO (dev) | File exists, but dev network issue |
| **New** audio (after Task 32 complete) | `audio_url` fallback | N/A | Won't fall back (signed URL succeeds) |

## Solutions

### Option 1: Data Migration (RECOMMENDED)

**Approach:** Migrate existing audio files to new semantic paths

**Steps:**
1. Create migration script to:
   - Query `analysis_audio_segments` WHERE `audio_url` IS NOT NULL AND `storage_path` IS NOT NULL
   - For each row: Copy file from `audio_url` location to `storage_path` location
   - Verify copy succeeded
   - Update row: set `audio_url` = NULL (mark as migrated)

**Pros:**
- ✅ Complete migration to new structure
- ✅ Historical playback works
- ✅ Clean separation (old vs new)

**Cons:**
- ⏱️ Requires migration script
- 💾 Temporary storage duplication during migration

### Option 2: Conditional Fallback Logic

**Approach:** Client checks if signed URL generation fails due to "file not found", then uses `audio_url`

**Already implemented** (lines 797-798 show this working)

**Limitation:** Won't fix dev environment network issue

### Option 3: Fix Dev Environment Network (QUICKEST)

**Approach:** Configure iOS Simulator to access local Supabase Storage

**Options:**
- Use `host.docker.internal` instead of `kong:8000` or `127.0.0.1`
- Configure Supabase local stack to be accessible from simulator
- Use ngrok/localtunnel to expose storage to simulator

**Pros:**
- ✅ Fixes immediate dev issue
- ✅ No code changes needed

**Cons:**
- ❌ Doesn't fix historical audio files
- ❌ Dev-only solution

## Recommended Action Plan

**Phase 1: Fix Dev Environment (IMMEDIATE)**
1. Configure local Supabase to be accessible from iOS Simulator
2. Update URL normalization in `AudioPlayer` to use correct host

**Phase 2: Data Migration (SHORT TERM)**
1. Create audio file migration script
2. Run migration for historical files
3. Verify playback works for all historical records

**Phase 3: Validation (VERIFICATION)**
1. Generate NEW audio (after full Task 32 deployment)
2. Verify files stored at semantic paths
3. Verify signed URL generation succeeds
4. Verify playback works

## Files to Update

### Immediate Fix (Dev Environment)
- `packages/ui/src/components/VideoAnalysis/AudioPlayer/AudioPlayer.native.tsx`
  - Line 801: Update URL normalization logic for simulator

### Data Migration
- Create: `scripts/supabase/migrate-audio-files-to-semantic-paths.mjs`
- Query historical files, copy to new paths, update database

## Test Plan

1. **Historical Audio (Pre-Migration)**
   - [ ] Verify `audio_url` fallback works
   - [ ] Verify `storage_path` fails gracefully
   - [ ] Verify playback uses legacy URL

2. **Migrated Audio (Post-Migration)**
   - [ ] Verify file exists at `storage_path`
   - [ ] Verify signed URL generation succeeds
   - [ ] Verify playback uses signed URL from semantic path

3. **New Audio (Post-Task 32)**
   - [ ] Verify file created at semantic path
   - [ ] Verify `storage_path` populated correctly
   - [ ] Verify signed URL generation succeeds
   - [ ] Verify playback works

## Status

✅ **ROOT CAUSE IDENTIFIED** - Two separate issues:
1. Historical audio files not migrated to new paths
2. Dev environment network isolation

⏳ **NEXT STEPS:**
1. Fix dev environment network access (quickest win)
2. Create data migration script for historical files
3. Verify new audio generation works end-to-end

