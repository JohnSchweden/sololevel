# Tasks


---

### Task 32: Storage Path Optimization - Database IDs + Date Partitioning [P0] 🔄 PENDING
**Effort:** 4 hours | **Priority:** P2 (Future optimization) | **Depends on:** None
**User Story:** Infrastructure - Storage organization and data lifecycle management

@step-by-step.md - Replace timestamp-based storage paths with database ID + date partitioning for better organization, debugging, and data lifecycle management.

**OBJECTIVE:** Migrate from timestamp-based file naming (`{user_id}/{timestamp}_{filename}`) to semantic, database-driven paths with date partitioning for improved storage organization and lifecycle management.

**RATIONALE:**
- **Current State:** Files stored as `488a7161.../{timestamp}_{original_filename}` (e.g., `1760388359718_video.mp4`)
  - ❌ No semantic meaning (what is "1760388359718"?)
  - ❌ Hard to correlate with database records
  - ❌ Debugging requires timestamp → DB lookup
  - ❌ No natural data partitioning strategy
  
- **Future Goal:** Database ID-based paths with date folders
  - ✅ Self-documenting (path contains video_recording_id)
  - ✅ Easy debugging (see ID in path → query DB directly)
  - ✅ Date partitioning for lifecycle management (delete old folders)
  - ✅ Faster storage operations at scale (partitioned by date)
  - ✅ Guaranteed uniqueness via primary keys
  - ✅ **Bucket separation maintained:** Videos in `raw`, audio in `processed` (security model unchanged)

**ARCHITECTURE ALIGNMENT:**
- **Videos (raw bucket):** `{user_id}/videos/{yyyymmdd}/{video_recording_id}/video.{format}`
- **Audio (processed bucket):** `{user_id}/videos/{yyyymmdd}/{video_recording_id}/audio/{feedback_id}/{segment_index}.{format}`
- **Bucket separation maintained:** Videos in `raw` (private), audio in `processed` (service-role only)
- **Video-centric grouping:** Logical grouping via matching paths, physical separation via buckets
- Date source: Database `created_at` timestamp (UTC, consistent)
- Migration: Backward compatible (old paths still accessible)

**STORAGE STRUCTURE:**
```
Bucket: raw (private, authenticated users)
└── {user_id}/videos/
    └── 20251014/              ← Date partition
        └── 1234/              ← video_recording_id
            └── video.mp4      ← Original video

Bucket: processed (private, service-role only)
└── {user_id}/videos/
    └── 20251014/              ← Date partition (matches raw bucket)
        └── 1234/              ← video_recording_id (matches raw bucket)
            └── audio/         ← Generated feedback audio
                ├── 1069/      ← feedback_id
                │   └── 0.wav  ← segment_index
                └── 1070/
                    └── 0.wav
```

**CURRENT STATE:**
- ✅ Video uploads functional with timestamp paths
- ✅ `video_recordings.storage_path` column exists
- ✅ `upsert: false` prevents collisions
- ❌ Paths use anonymous timestamps
- ❌ No date partitioning
- ❌ No audio storage_path column

**SCOPE:**

#### Module 1: Database Schema Updates
**Summary:** Add `storage_path` column to `analysis_audio_segments` and update column comments.

**File:** `supabase/migrations/[timestamp]_optimize_storage_paths.sql`

**Tasks:**
- [ ] Add `storage_path TEXT` column to `analysis_audio_segments`
- [ ] Add index on `storage_path` for query performance
- [ ] Update `video_recordings.storage_path` column comment with new format
- [ ] Add column comment for `audio_segments.storage_path`
- [ ] Test migration on local Supabase instance
- [ ] Update TypeScript types in `packages/api/types/database.ts`

**SQL Schema:**
```sql
-- Update video_recordings comment
COMMENT ON COLUMN video_recordings.storage_path IS 
'Storage path format: {user_id}/videos/{yyyymmdd}/{video_recording_id}/video.{format}
Date extracted from created_at (UTC). Video-centric grouping for all related assets. Example: 488a7161.../videos/20251014/1234/video.mp4';

-- Add storage_path to analysis_audio_segments
ALTER TABLE analysis_audio_segments 
ADD COLUMN storage_path TEXT;

-- Add index for query performance
CREATE INDEX idx_audio_segments_storage_path 
ON analysis_audio_segments(storage_path) 
WHERE storage_path IS NOT NULL;

-- Add comment
COMMENT ON COLUMN analysis_audio_segments.storage_path IS 
'Storage path format: {user_id}/videos/{yyyymmdd}/{video_recording_id}/audio/{feedback_id}/{segment_index}.{format}
Date extracted from video_recordings.created_at (UTC). Groups audio with video assets. Example: 488a7161.../videos/20251014/1234/audio/1069/0.wav';
```

**Acceptance Criteria:**
- [ ] Migration runs without errors on local Supabase
- [ ] Column comments updated with path format documentation
- [ ] `audio_segments.storage_path` accepts NULL and TEXT values
- [ ] Index created successfully
- [ ] TypeScript types updated and type-check passes
- [ ] Existing data unaffected (audio column defaults to NULL)

#### Module 2: Storage Path Helper Functions
**Summary:** Create utility functions for consistent path generation.

**File:** `packages/api/src/services/storagePathHelpers.ts` (new file)

**Tasks:**
- [ ] Create `getDateFolder(isoTimestamp: string): string` utility
- [ ] Create `buildVideoPath()` function
- [ ] Create `buildAudioPath()` function
- [ ] Add JSDoc documentation with examples
- [ ] Export from `packages/api/src/index.ts`
- [ ] Add unit tests

**Function Interfaces:**
```typescript
/**
 * Extract date folder from ISO timestamp
 * @param isoTimestamp ISO 8601 timestamp (e.g., "2025-10-14T12:30:45.123Z")
 * @returns Date folder in yyyymmdd format (e.g., "20251014")
 */
export function getDateFolder(isoTimestamp: string): string {
  return isoTimestamp.slice(0, 10).replace(/-/g, '')
}

/**
 * Build storage path for video recording
 * @param userId User UUID
 * @param videoRecordingId Video recording primary key
 * @param createdAt ISO timestamp from video_recordings.created_at
 * @param format File format (mp4, mov)
 * @returns Storage path: {user_id}/videos/{yyyymmdd}/{video_recording_id}/video.{format}
 * @example buildVideoPath('488a...', 1234, '2025-10-14T12:30:00Z', 'mp4')
 *          // Returns: '488a.../videos/20251014/1234/video.mp4'
 */
export function buildVideoPath(
  userId: string,
  videoRecordingId: number,
  createdAt: string,
  format: string
): string

/**
 * Build storage path for audio segment
 * @param userId User UUID
 * @param videoRecordingId Video recording primary key
 * @param feedbackId Feedback primary key
 * @param segmentIndex Segment index (0, 1, 2, ...)
 * @param videoCreatedAt ISO timestamp from video_recordings.created_at
 * @param format File format (mp3, wav)
 * @returns Storage path: {user_id}/videos/{yyyymmdd}/{video_id}/audio/{feedback_id}/{segment_index}.{format}
 * @example buildAudioPath('488a...', 1234, 1069, 0, '2025-10-14T12:30:00Z', 'wav')
 *          // Returns: '488a.../videos/20251014/1234/audio/1069/0.wav'
 */
export function buildAudioPath(
  userId: string,
  videoRecordingId: number,
  feedbackId: number,
  segmentIndex: number,
  videoCreatedAt: string,
  format: string
): string
```

**Acceptance Criteria:**
- [ ] Date extraction handles UTC timestamps correctly
- [ ] Paths match documented format exactly
- [ ] Functions exported from `@my/api`
- [ ] JSDoc examples provided
- [ ] Unit tests cover edge cases (timezone, formats)

#### Module 3: Video Upload Service Migration
**Summary:** Update video upload to use new path format.

**File:** `packages/api/src/services/videoUploadService.ts` (modify)

**Tasks:**
- [ ] Update `createSignedUploadUrl()` to use `buildVideoPath()`
- [ ] Remove timestamp-based path generation (line 71-72)
- [ ] Pass `video_recording_id` and `created_at` to path builder
- [ ] Update `storage_path` in database with new format
- [ ] Maintain backward compatibility (old paths still work)
- [ ] Add logging for path generation
- [ ] Update inline comments

**Implementation Notes:**
- Chicken-egg problem: Need `video_recording_id` before creating signed URL
- Solution: Create DB record first (pending status), then generate path
- **Bucket:** Videos uploaded to `raw` bucket (unchanged from current implementation)
- Path is relative to bucket: `raw/{user_id}/videos/{yyyymmdd}/...`

**Code Changes:**
```typescript
// OLD (line 71-72)
const timestamp = Date.now()
const path = `${user.data.user.id}/${timestamp}_${filename}`

// NEW
const recording = await createVideoRecording({
  // ... initial fields ...
  storage_path: '', // Temporary
  upload_status: 'pending',
})

const storagePath = buildVideoPath(
  user.data.user.id,
  recording.id,
  recording.created_at,
  format
)

await updateVideoRecording(recording.id, {
  storage_path: storagePath,
})

const { signedUrl } = await createSignedUploadUrl(storagePath, file.size)
```

**Acceptance Criteria:**
- [ ] Video uploads use new path format
- [ ] Database `storage_path` matches actual storage location
- [ ] Old videos with timestamp paths still accessible
- [ ] No upload failures due to path changes
- [ ] Logging shows generated paths for debugging

#### Module 4: Audio Worker Integration (Future)
**Summary:** Prepare audio generation to use new path format (grouped by video).

**File:** `supabase/functions/ai-analyze-video/workers/audioWorker.ts` (modify)

**Tasks:**
- [ ] Import `buildAudioPath()` helper
- [ ] Fetch `video_recording_id` and `created_at` from job context
- [ ] Generate path using video_recording_id/feedback IDs + video creation date
- [ ] Store `storage_path` in `analysis_audio_segments` table
- [ ] Keep `audio_url` for backward compatibility during migration
- [ ] Add logging for path generation
- [ ] Update Edge Function tests

**Implementation Notes:**
- Audio paths use `video_recordings.created_at` for date folder (not job/segment creation time)
- Ensures all audio for a video grouped with the video file in same date folder
- Path format: `{user_id}/videos/{yyyymmdd}/{video_id}/audio/{feedback_id}/{segment_index}.{format}`
- Grouping by video (not job) since relationship is 1:1 and video is root entity
- **Bucket:** Audio uploaded to `processed` bucket (unchanged from current implementation)
- Path is relative to bucket: `processed/{user_id}/videos/{yyyymmdd}/...`

**Acceptance Criteria:**
- [ ] Audio segments use new path format
- [ ] `storage_path` column populated correctly
- [ ] Date folder matches `video_recordings.created_at`
- [ ] Audio grouped under video folder structure
- [ ] Old audio with `audio_url` only still works (fallback)

#### Module 5: Client-Side Signed URL Generation
**Summary:** Update client to generate signed URLs from storage_path.

**Files:**
- `packages/api/src/services/audioService.ts` (modify)
- `packages/app/features/VideoAnalysis/VideoAnalysisScreen.tsx` (already done for videos)

**Tasks:**
- [ ] Update `getFirstAudioUrlForFeedback()` to prefer `storage_path`
- [ ] Generate signed URL from `storage_path` if available
- [ ] Fallback to `audio_url` for old records
- [ ] Add logging for URL generation source
- [ ] Document migration path in comments

**Code Pattern:**
```typescript
// Prefer storage_path, fallback to audio_url
if (row?.storage_path) {
  const { data } = await createSignedDownloadUrl('processed', row.storage_path)
  return { ok: true, url: data.signedUrl }
}
if (row?.audio_url) {
  return { ok: true, url: row.audio_url } // Old records
}
```

**Acceptance Criteria:**
- [ ] Audio playback works with new paths
- [ ] Signed URLs generated with 1-hour TTL
- [ ] Old records with `audio_url` still work
- [ ] Logging indicates which path used (storage_path vs audio_url)

#### Module 6: Data Lifecycle Benefits (Documentation)
**Summary:** Document storage organization benefits for operations.

**File:** `docs/architecture/storage-organization.md` (new file)

**Tasks:**
- [ ] Document path structure and rationale
- [ ] Document date folder benefits (cleanup, archival)
- [ ] Document retention policy examples
- [ ] Document storage metrics by date
- [ ] Document debugging workflows

**Benefits to Document:**
- Cleanup: `DELETE FROM storage.objects WHERE name LIKE '%/videos/202401%'` (delete January 2024 from both buckets)
- Video grouping: All video assets in one logical folder `videos/20251014/1234/` (physical separation by bucket)
- **Bucket security:** `raw` = authenticated users (videos), `processed` = service-role only (audio)
- Archival: Move old date folders to cold storage (per bucket)
- Metrics: Count files per month for analytics (aggregate across buckets)
- Debugging: "Video uploaded Oct 14?" → check `videos/20251014/` in both buckets
- Future expansion: Easy to add pose data, thumbnails under same video folder

**Acceptance Criteria:**
- [ ] Architecture documentation complete
- [ ] Operations runbook includes storage lifecycle
- [ ] Examples for cleanup/archival provided
- [ ] Debugging workflows documented

#### Module 7: Test Suite
**Summary:** Unit tests for path generation and migration.

**File:** `packages/api/src/services/storagePathHelpers.test.ts` (new file)

**Tasks:**
- [ ] Test `getDateFolder()` with various timestamps
- [ ] Test `buildVideoPath()` output format
- [ ] Test `buildAudioPath()` output format
- [ ] Test timezone handling (UTC consistency)
- [ ] Test format flexibility (mp4/mov, mp3/wav)
- [ ] Mock database timestamps

**Acceptance Criteria:**
- [ ] All helper functions covered
- [ ] Edge cases tested (leap years, timezone boundaries)
- [ ] Output format validated against documentation
- [ ] Tests pass with 100% coverage of helpers

#### Module 8: Manual QA
**Summary:** End-to-end validation of new storage paths.

**Tasks:**
- [ ] Upload video → verify path matches `{user_id}/videos/{yyyymmdd}/{id}.{format}`
- [ ] Check database: `storage_path` populated correctly
- [ ] Verify file accessible via signed URL
- [ ] Generate audio → verify path matches documented format
- [ ] Check audio playback works with new paths
- [ ] Verify old videos/audio still accessible (backward compatibility)
- [ ] Check Supabase Storage dashboard: organized by date folders
- [ ] Test date folder cleanup (delete test folder manually)

**SUCCESS VALIDATION:**
- [ ] `yarn type-check` passes ✅ (0 errors)
- [ ] `yarn workspace @my/api test storagePathHelpers.test.ts --run` → all tests pass
- [ ] `yarn lint` passes ✅ (0 errors)
- [ ] Manual QA: All items above verified
- [ ] Storage: Files organized by date folders in Supabase dashboard
- [ ] Backward compatibility: Old timestamp paths still work

**FILES TO CREATE:**
- `supabase/migrations/[timestamp]_optimize_storage_paths.sql` (database migration)
- `packages/api/src/services/storagePathHelpers.ts` (path generation utilities)
- `packages/api/src/services/storagePathHelpers.test.ts` (unit tests)
- `docs/architecture/storage-organization.md` (documentation)

**FILES TO MODIFY:**
- `packages/api/src/services/videoUploadService.ts` (use buildVideoPath)
- `supabase/functions/ai-analyze-video/workers/audioWorker.ts` (use buildAudioPath)
- `packages/api/src/services/audioService.ts` (prefer storage_path)
- `packages/api/types/database.ts` (add storage_path to audio_segments)
- `packages/api/src/index.ts` (export path helpers)

**MIGRATION STRATEGY:**
- Phase 1: Add `storage_path` columns (backward compatible)
- Phase 2: Update services to populate both old and new fields
- Phase 3: Client prefers `storage_path`, falls back to old fields
- Phase 4: Deprecate old fields (future task, not in scope)

**BENEFITS:**
- 🔍 **Debugging**: See video/audio ID in path → instant DB correlation
- 🗓️ **Lifecycle**: Delete old date folders for retention policies
- 📊 **Analytics**: Storage metrics by month/year via folder counts
- ⚡ **Performance**: Faster listing at scale (partitioned by date)
- 🔒 **Uniqueness**: Primary key-based, guaranteed no collisions

---

### Task 31: Video Thumbnail Cloud Storage Migration ✅ COMPLETED
**Effort:** 1 day | **Priority:** P1 (Future optimization) | **Depends on:** Task 30
**User Story:** US-HI-01a (Videos Section - Horizontal Thumbnail Gallery)

@step-by-step.md - Migrate thumbnail storage from client-side device storage to Supabase Storage with CDN-backed delivery.

**STATUS:** ✅ **COMPLETED** - All modules implemented and tested successfully.

**OBJECTIVE:** Move thumbnails from client-side storage (local file URIs/data URLs in `metadata.thumbnailUri`) to Supabase Storage `thumbnails` bucket (public, CDN-backed) with immutable caching, add dedicated `thumbnail_url` column, and update cache retrieval to use cloud URLs.

**RATIONALE:**
- **Current State (Task 30):** Thumbnails stored as client-side URIs in `metadata.thumbnailUri` JSONB field
  - Native: `file://` local file URIs stored on device
  - Web: `data:` URLs (base64) stored in browser
- **Future Goal (Task 31):** Cloud-hosted thumbnails with CDN delivery
  - Faster load times via CDN caching
  - Reduced client storage usage
  - Centralized thumbnail management
  - Better cross-device consistency

**ARCHITECTURE ALIGNMENT:**
- Storage: Supabase Storage `thumbnails` bucket (public read; images only)
- Database: Dedicated `thumbnail_url` TEXT column with index for performance
- CDN: Automatic via Supabase Storage public URLs
- Cache: Immutable caching via hashed filenames and `Cache-Control: public, max-age=31536000, immutable`
- Backward compatibility: Fallback to `metadata.thumbnailUri` for old records

**CURRENT STATE:**
- ✅ Thumbnails generated during compression (Task 30 Module 2/3)
- ✅ Local URIs stored in `metadata.thumbnailUri` (Task 30 Module 5)
- ✅ Cache retrieval from database (Task 30 Module 5)
- ❌ No cloud storage upload
- ❌ No dedicated `thumbnail_url` column
- ❌ No Supabase Storage bucket configuration
- ❌ No CDN delivery

**SCOPE:**

#### Module 1: Database Schema Update [from Task 30 Module 1]
**Summary:** Add `thumbnail_url` column to `video_recordings` table for cloud storage URLs.

**Cross-reference:** Deferred from Task 30 Module 1 - Database Schema Update

**File:** `supabase/migrations/[timestamp]_add_thumbnail_url.sql`

**Tasks:**
- [x] Create migration to add `thumbnail_url TEXT` column
- [x] Add index on `thumbnail_url` for query performance
- [x] Update RLS policies (no changes needed - inherits from row policies)
- [x] Test migration on local Supabase instance
- [x] Update TypeScript types in `packages/api/types/database.ts`

**SQL Schema:**
```sql
-- Add thumbnail_url column to video_recordings
ALTER TABLE video_recordings 
ADD COLUMN thumbnail_url TEXT;

-- Add index for query performance
CREATE INDEX idx_video_recordings_thumbnail_url 
ON video_recordings(thumbnail_url) 
WHERE thumbnail_url IS NOT NULL;

-- Add comment
COMMENT ON COLUMN video_recordings.thumbnail_url IS 
'Public URL to video thumbnail in Supabase Storage (thumbnails bucket)';
```

**Acceptance Criteria:**
- [x] Migration runs without errors on local Supabase
- [x] Column accepts NULL and TEXT values
- [x] Index created successfully
- [x] TypeScript types updated and type-check passes
- [x] Existing data unaffected (column defaults to NULL)

#### Module 2: Supabase Storage Upload Service [from Task 30 Module 4]
**Summary:** Upload thumbnail to Supabase Storage `thumbnails` bucket and get CDN URL (immutable caching).

**Cross-reference:** Deferred from Task 30 Module 4 - Supabase Storage Upload

**File:** `packages/api/src/services/videoThumbnailService.ts` (modify shared file)

**Tasks:**
- [x] Create `uploadVideoThumbnail(thumbnailUri, videoId, userId)` function
- [x] Generate content hash of image bytes for immutable filename
- [x] Upload to `thumbnails/{userId}/videos/{yyyymmdd}/{videoId}/{hash}.jpg`
- [x] Set content type to `image/jpeg` and `cacheControl: '31536000'`
- [x] Get public URL after upload
- [x] Handle upload failures gracefully with retry logic (retry once)
- [x] Add structured logging for upload (success/failure/duration)
- [x] Ensure `thumbnails` bucket exists with public read policy and image MIME allowlist
- [x] Convert local URI/data URL to blob for upload

**Function Interface:**
```typescript
export async function uploadVideoThumbnail(
  thumbnailUri: string,
  videoId: number,
  userId: string,
  createdAtIso: string
): Promise<string | null> {
  try {
    // Convert local URI/data URL to blob for upload
    const response = await fetch(thumbnailUri)
    const blob = await response.blob()

    // Compute a stable content hash to create an immutable filename
    const arrayBuffer = await blob.arrayBuffer()
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hash = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 16)

    // Optional: yyyymmdd date folder for organization
    const yyyymmdd = createdAtIso.slice(0, 10).replace(/-/g, '')
    const filePath = `thumbnails/${userId}/videos/${yyyymmdd}/${videoId}/${hash}.jpg`

    const { error } = await supabase.storage
      .from('thumbnails')
      .upload(filePath, blob, {
        contentType: 'image/jpeg',
        upsert: false, // immutable by hash
        cacheControl: '31536000',
      })

    if (error) throw error

    const { data: urlData } = supabase.storage
      .from('thumbnails')
      .getPublicUrl(filePath)

    return urlData.publicUrl
  } catch (error) {
    logger.error('Failed to upload thumbnail', { videoId, error })
    return null
  }
}
```

**Acceptance Criteria:**
- [x] Thumbnail uploads successfully to `thumbnails` bucket
- [x] Public URL returned and accessible via CDN
- [x] File path uses immutable hashed filename under `thumbnails/{userId}/videos/{yyyymmdd}/{videoId}/`
- [x] Strong caching applied (`cacheControl: 31536000`); no overwrites (no upsert)
- [x] Errors handled gracefully with retry logic
- [x] Logging captures upload metrics (duration, size, success/failure)
- [x] Bucket configuration verified (public read access, image MIME allowlist)

#### Module 3: Pipeline Integration
**Summary:** Integrate cloud upload into video upload pipeline after local thumbnail generation.

**Files:**
- `packages/app/services/videoUploadAndAnalysis.ts` (modify)
- `packages/api/src/services/videoUploadService.ts` (modify)

**Tasks:**
- [x] Call `uploadVideoThumbnail()` after local thumbnail generation in `videoUploadAndAnalysis.ts`
- [x] Pass cloud URL to `uploadVideo()` instead of local URI
- [x] Store cloud URL in `thumbnail_url` column (not `metadata.thumbnailUri`)
- [x] Maintain backward compatibility: keep `metadata.thumbnailUri` for local fallback
- [x] Maintain non-blocking behavior (upload failures don't crash pipeline)
- [x] Add structured logging for cloud upload step

**Integration Pattern:**
```typescript
// After local thumbnail generation (Task 30 Module 2/3)
const localThumbnail = await generateVideoThumbnail(videoUri)

// Upload to cloud storage (Task 31 Module 2)
const cloudUrl = await uploadVideoThumbnail(
  localThumbnail?.uri,
  videoRecordingId,
  userId
).catch(() => null)

// Store in database with fallback
const metadata = {
  thumbnailUri: localThumbnail?.uri, // Local fallback
}

await uploadVideo(videoUri, {
  thumbnailUrl: cloudUrl, // Cloud URL in dedicated column
  metadata,
})
```

**Acceptance Criteria:**
- [x] Cloud upload runs after local thumbnail generation
- [x] Public URL stored in `thumbnail_url` column
- [x] Local URI still stored in `metadata.thumbnailUri` (fallback)
- [x] Pipeline doesn't fail if cloud upload fails
- [x] Graceful degradation to local URI if cloud unavailable
- [x] Structured logging for debugging

#### Module 4: Cache Retrieval Update
**Summary:** Update cache retrieval to prefer cloud URLs over local URIs.

**File:** `packages/app/features/VideoAnalysis/stores/analysisStatus.ts` (modify)

**Tasks:**
- [x] Update `setJobResults()` to read `thumbnail_url` column first
- [x] Fallback to `metadata.thumbnailUri` if `thumbnail_url` is null (backward compatibility)
- [x] Update `historyStore.updateCache()` to use cloud URL when available
- [x] Add null checks for missing thumbnails
- [x] Add logging for cache retrieval source (cloud vs local)

**Retrieval Pattern:**
```typescript
// Prefer cloud URL, fallback to local URI
const thumbnail = videoRecording.thumbnail_url 
  || videoRecording.metadata?.thumbnailUri

historyStore.updateCache({
  thumbnail, // Cloud URL or local URI
})
```

**Acceptance Criteria:**
- [x] Cache retrieval prefers `thumbnail_url` over `metadata.thumbnailUri`
- [x] Fallback to `metadata.thumbnailUri` works for old records
- [x] Cache stores cloud URL correctly
- [x] VideosSection displays thumbnails from cloud URLs (CDN)
- [x] Backward compatibility maintained for existing records

#### Module 5: Test Suite
**Summary:** Unit tests for cloud storage upload.

**File:** `packages/api/src/services/videoThumbnailService.test.ts` (extend existing tests)

**Tasks:**
- [x] Test successful cloud upload (native + web platforms)
- [x] Test upload failure handling with retry
- [x] Test public URL generation
- [x] Test blob conversion from local URI and data URL
- [x] Test upsert behavior (overwrites existing)
- [x] Mock Supabase Storage client

**Acceptance Criteria:**
- [x] All tests pass (existing 9 + new cloud upload tests)
- [x] Cloud upload logic tested separately from local generation
- [x] Error cases covered (network failures, bucket errors, auth failures)
- [x] Retry logic verified (1 retry attempt)
- [x] Platform-specific blob conversion tested

#### Module 6: Manual QA
**Summary:** End-to-end validation of cloud storage migration.

**Tasks:**
- [x] Record video → thumbnail uploaded to Supabase Storage
- [x] Verify `thumbnail_url` populated in database
- [x] Verify cloud URL is publicly accessible (CDN)
- [x] VideosSection displays thumbnails from cloud URLs
- [x] Upload pipeline succeeds even if cloud upload fails
- [x] Thumbnail load time < 500ms (CDN benefit)
- [x] Old records with `metadata.thumbnailUri` still work (backward compatibility)
- [x] Verify bucket storage quota usage

**SUCCESS VALIDATION:**
- [x] `yarn type-check` passes ✅ (0 errors)
- [x] `yarn workspace @my/api test videoThumbnailService.test.ts --run` → all tests pass
- [x] `yarn lint` passes ✅ (0 errors)
- [x] Manual QA: All items above verified
- [x] Performance: Cloud thumbnail load < 500ms (CDN)
- [x] Storage: Thumbnails visible in Supabase Storage dashboard

**FILES TO CREATE:**
- `supabase/migrations/[timestamp]_add_thumbnail_url.sql` (database migration)

**FILES TO MODIFY:**
- `packages/api/src/services/videoThumbnailService.ts` (add cloud upload function)
- `packages/app/services/videoUploadAndAnalysis.ts` (integrate cloud upload)
- `packages/api/src/services/videoUploadService.ts` (store `thumbnail_url`)
- `packages/app/features/VideoAnalysis/stores/analysisStatus.ts` (read `thumbnail_url`)
- `packages/api/types/database.ts` (add `thumbnail_url` to types)
- `packages/api/src/services/videoThumbnailService.test.ts` (extend with cloud upload tests)

**DEPENDENCIES:**
- Supabase Storage `thumbnails` bucket must be configured with public read access and image MIME allowlist
- Set default Cache-Control for the bucket (or per-upload `cacheControl: '31536000'`)
- Database migration must run before code deployment
- Backward compatibility maintained throughout migration

**COMPLETION SUMMARY:**
✅ **Task 31 Successfully Completed** - All modules implemented and tested:

**Key Achievements:**
- ✅ Database migration created and applied (`20251020130924_add_thumbnail_url_and_bucket.sql`)
- ✅ `thumbnails` bucket configured with public read access and image MIME allowlist
- ✅ `uploadVideoThumbnail()` function implemented with cross-platform compatibility
- ✅ Content-hashed immutable filenames for CDN caching (`{hash}.jpg`)
- ✅ Date-partitioned storage paths (`{userId}/videos/{yyyymmdd}/{videoId}/`)
- ✅ Automatic retry logic (1 attempt) with graceful error handling
- ✅ Pipeline integration with non-blocking cloud upload
- ✅ Cache retrieval updated to prefer cloud URLs with local fallback
- ✅ All tests passing (18/18) with comprehensive coverage
- ✅ Type-check and lint passing (0 errors)
- ✅ Manual QA validated: thumbnails upload successfully to CDN

**Technical Implementation:**
- **Cross-platform compatibility:** Uses `expo-crypto` for hashing and `expo-file-system` for file reading
- **React Native compatibility:** Uses FormData with signed URLs instead of direct blob uploads
- **CDN optimization:** 1-year cache control (`31536000` seconds) with immutable hashed filenames
- **Error resilience:** Non-blocking upload with retry logic and graceful degradation
- **Backward compatibility:** Maintains `metadata.thumbnailUri` fallback for existing records

**Performance Benefits:**
- 🚀 Faster thumbnail loading via CDN delivery
- 💾 Reduced client storage usage (no local thumbnail storage)
- 🔄 Centralized thumbnail management
- 📱 Better cross-device consistency

---

### Task 11: Eliminate useFeedbackPanel Redundancy 
**Effort:** 2 hours | **Priority:** Medium | **Depends on:** Task 10

@step-by-step-rule.mdc - Evaluate and potentially remove useFeedbackPanel hook if it only wraps useState with no business logic.

OBJECTIVE: Reduce abstraction overhead by eliminating hooks that don't provide value beyond useState.

CURRENT STATE:
- packages/app/features/VideoAnalysis/hooks/useFeedbackPanel.ts (78 lines)
- Only manages: panelFraction, activeTab, selectedFeedbackId
- selectedFeedbackId now redundant with useFeedbackSelection.highlightedFeedbackId
- panelFraction/activeTab are simple UI state (expand/collapse, tab switching)

DECISION CRITERIA:
IF useFeedbackPanel only does:
  - useState wrappers
  - No coordination with other hooks
  - No complex business logic
THEN: Remove it, move state directly to VideoAnalysisScreen or FeedbackSection

IF it provides:
  - Animation coordination
  - Complex panel lifecycle management
  - Multi-component synchronization
THEN: Keep it but remove selectedFeedbackId (now redundant)

SCOPE:
- OPTION A (Most Likely): Remove hook entirely
  - DELETE: packages/app/features/VideoAnalysis/hooks/useFeedbackPanel.ts
  - DELETE: packages/app/features/VideoAnalysis/hooks/useFeedbackPanel.test.ts
  - MODIFY: VideoAnalysisScreen.tsx - Replace with useState for panelFraction/activeTab
  
- OPTION B: Keep but simplify
  - REMOVE: selectedFeedbackId from interface (now handled by useFeedbackSelection)
  - KEEP: panelFraction and activeTab management
  - UPDATE: Tests to remove selectedFeedbackId coverage

ACCEPTANCE CRITERIA:
- [ ] No redundant selectedFeedbackId state
- [ ] Panel expand/collapse still works
- [ ] Tab switching still works
- [ ] No loss of animation coordination (if Option B)
- [ ] VideoAnalysisScreen.tsx cleaner, not more complex
- [ ] All existing panel behavior preserved

SUCCESS VALIDATION:
- yarn type-check passes
- Panel expands/collapses smoothly
- Tab switching works
- No state synchronization bugs

