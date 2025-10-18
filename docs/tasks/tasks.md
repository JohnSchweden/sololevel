# Tasks

---

### Task 33: Instant Tab Switching - Parent Task 
**Effort:** 8 hours total | **Priority:** P1 (UX Critical) | **Depends on:** None
**User Story:** US-NAV-01 - Bottom Navigation with Instant Switching

@step-by-step.md - Refactor app navigation from Stack-based routing to Expo Router Tabs Layout pattern for instant tab switching without animations, matching Instagram/Spotify UX patterns.

**OBJECTIVE:** Replace current Stack navigation pattern with Expo Router Tabs Layout to enable instant tab switching without screen transitions, preserving tab state and eliminating back stack issues.

**Total Effort:** 7.5 hours (reduced from 8 hours - Insights screen already exists)

**SUB-TASKS:**
- Task 33a: Tabs Layout Infrastructure Setup [1.5h]
- Task 33b: Custom Tab Bar Integration [1.5h]
- Task 33c: Migrate Camera/Record Tab [1.5h]
- Task 33d: Migrate Coach Tab [1h]
- Task 33e: Migrate Insights Tab [1h]
- Task 33f: Clean Up & Documentation [1h]

---

### Task 33a: Tabs Layout Infrastructure Setup 
**Effort:** 1.5 hours | **Priority:** P1 (UX Critical) | **Depends on:** None
**User Story:** US-NAV-01 - Bottom Navigation Infrastructure

@step-by-step.md - Create Expo Router `(tabs)` group layout structure and configure root navigation for tabs pattern.

**RATIONALE:**
- **Current State (Stack Navigation):** Each tab is a separate route with full screen navigation
  - ❌ Tab change = `router.push('/coach')` → navigation animation → adds to back stack
  - ❌ Loses tab state when switching (scroll position, form inputs)
  - ❌ Back button issues (back stack grows with tab changes)
  - ❌ Not native-feeling (Instagram/Spotify have instant switching)
  
- **Future Goal (Tabs Layout):** All tabs pre-mounted with instant view switching
  - ✅ Tab change = instant show/hide → no animation → no back stack
  - ✅ Preserves tab state (scroll, form, video playback position)
  - ✅ Native iOS/Android tab patterns out of the box
  - ✅ Memory efficient (React Native optimizes inactive tabs)
  - ✅ Battle-tested pattern used by all major apps

**ARCHITECTURE ALIGNMENT:**
- Expo Router file-based routing with `(tabs)` group layout
- Custom tab bar using existing `BottomNavigation` component
- State persistence via `useTabPersistence` hook (already exists)
- Tab state preserved in memory (no remounting on switch)
- Modal routes for settings, video-analysis (outside tabs)

**CURRENT STATE:**
- ✅ `BottomNavigation` component with 3 tabs (coach/record/insights)
- ✅ `useTabPersistence` hook for AsyncStorage state
- ✅ Screen components (CoachScreen, CameraRecordingScreen, InsightsScreen)
- ❌ Stack-based routing with `router.push()` navigation
- ❌ Tab changes trigger animations and back stack growth
- ❌ No state preservation between tabs

**SCOPE:**

#### Module 1: Create Tabs Directory Structure

**Tasks:**
- [ ] Create `apps/expo/app/(tabs)/` directory
- [ ] Create `apps/expo/app/(tabs)/_layout.tsx` (Tabs navigator)
- [ ] Create `apps/expo/app/(tabs)/record.tsx` (Camera screen - default)
- [ ] Create `apps/expo/app/(tabs)/coach.tsx` (Coach AI screen)
- [ ] Create `apps/expo/app/(tabs)/insights.tsx` (History & Progress)
- [ ] Move screen components to tab routes (wrap, don't duplicate)
- [ ] Configure `initialRouteName` to "record" (camera default)
- [ ] Hide default tab bar (use custom `BottomNavigation`)

**File Structure:**
```
apps/expo/app/
├── _layout.tsx (Root - will modify to nest tabs)
├── (tabs)/
│   ├── _layout.tsx (NEW - Empty placeholder for now)
│   ├── record.tsx (NEW - Empty placeholder)
│   ├── coach.tsx (NEW - Empty placeholder)
│   └── insights.tsx (NEW - Empty placeholder)
├── video-analysis.tsx (Keep as modal)
├── settings.tsx (Keep as modal)
└── settings/* (Keep as modals)
```

**Tasks:**
- [ ] Create `apps/expo/app/(tabs)/` directory
- [ ] Create `apps/expo/app/(tabs)/_layout.tsx` with minimal Tabs setup
- [ ] Create empty placeholder routes: `record.tsx`, `coach.tsx`, `insights.tsx`
- [ ] Update root `_layout.tsx` to include `(tabs)` as first screen
- [ ] Keep existing routes functional during migration
- [ ] Repeat for `apps/web/app/` (same structure)

**Minimal _layout.tsx:**
```typescript
import { Tabs } from 'expo-router'

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="record" />
      <Tabs.Screen name="coach" />
      <Tabs.Screen name="insights" />
    </Tabs>
  )
}
```

**Acceptance Criteria:**
- [ ] `(tabs)` directory created in both expo and web apps
- [ ] Empty placeholder files created
- [ ] Tabs can be navigated to via `/(tabs)/record` URL
- [ ] Existing routes still work (not broken)
- [ ] Type checking passes

---

### Task 33b: Custom Tab Bar Integration 
**Effort:** 1.5 hours | **Priority:** P1 (UX Critical) | **Depends on:** Task 33a
**User Story:** US-NAV-01 - Custom Bottom Navigation

@step-by-step.md - Integrate existing `BottomNavigation` component as custom tab bar with state persistence.

**SCOPE:**

**Files:**
- `apps/expo/app/(tabs)/_layout.tsx` (modify)
- `apps/web/app/(tabs)/_layout.tsx` (modify)

**Tasks:**
- [ ] Import `BottomNavigation`, `BottomNavigationContainer` from `@my/ui`
- [ ] Import `useTabPersistence` hook
- [ ] Map Expo Router's current route to `activeTab` state
- [ ] Handle tab changes: update AsyncStorage + navigate
- [ ] Render custom tab bar via `tabBar` prop
- [ ] Hide default Expo tab bar
- [ ] Test instant switching (no animation)
- [ ] Test state persistence across app restarts

**Implementation Pattern:**
```typescript
import { Tabs } from 'expo-router'
import { BottomNavigationContainer, BottomNavigation } from '@my/ui'
import { useTabPersistence } from '@app/features/CameraRecording/hooks/useTabPersistence'

export default function TabsLayout() {
  const { activeTab, setActiveTab } = useTabPersistence()
  
  return (
    <Tabs
      initialRouteName="record"
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none' }, // Hide default
      }}
      tabBar={(props) => (
        <BottomNavigationContainer>
          <BottomNavigation
            activeTab={activeTab}
            onTabChange={(tab) => {
              setActiveTab(tab)
              props.navigation.navigate(tab)
            }}
          />
        </BottomNavigationContainer>
      )}
    >
      <Tabs.Screen name="record" />
      <Tabs.Screen name="coach" />
      <Tabs.Screen name="insights" />
    </Tabs>
  )
}
```

**Acceptance Criteria:**
- [ ] Custom tab bar renders at bottom
- [ ] Tab switching is instant (< 16ms, no animation)
- [ ] Active tab indicator updates correctly
- [ ] AsyncStorage state persists across restarts
- [ ] Works on both native and web

---

### Task 33c: Migrate Camera/Record Tab 
**Effort:** 1.5 hours | **Priority:** P1 (UX Critical) | **Depends on:** Task 33b
**User Story:** US-CAM-01 - Camera Screen in Tabs Context

@step-by-step.md - Move camera recording screen to `(tabs)/record.tsx` route with proper navigation handlers.
**SCOPE:**

**Files:**
- `apps/expo/app/(tabs)/record.tsx` (create)
- `apps/web/app/(tabs)/record.tsx` (create)
- `apps/expo/app/index.tsx` (will delete later)

**Tasks:**
- [ ] Create tab route wrapping `CameraRecordingScreen`
- [ ] Remove `onTabChange` prop (handled by tabs layout)
- [ ] Keep `onNavigateToVideoAnalysis` handler
- [ ] Remove `onNavigateToHistory` (switch to insights tab instead)
- [ ] Handle `resetToIdle` param via `useLocalSearchParams`
- [ ] Test camera permissions work in tabs
- [ ] Test video recording flow
- [ ] Verify bottom nav doesn't block controls
- [ ] Test state preservation when switching away and back

**Implementation:**
```typescript
import { CameraRecordingScreen } from '@app/features/CameraRecording'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { AuthGate } from '../../components/AuthGate'

export default function RecordTab() {
  const router = useRouter()
  const { resetToIdle } = useLocalSearchParams<{ resetToIdle?: string }>()

  return (
    <AuthGate>
      <CameraRecordingScreen
        onNavigateToVideoAnalysis={(uri) => 
          router.push({ pathname: '/video-analysis', params: { videoUri: uri } })
        }
        resetToIdle={resetToIdle === 'true'}
      />
    </AuthGate>
  )
}
```

**Acceptance Criteria:**
- [ ] Camera renders and functions in tab
- [ ] Video recording works end-to-end
- [ ] Navigation to video-analysis opens modal
- [ ] Bottom nav doesn't interfere with camera UI
- [ ] Camera state preserved when switching tabs
- [ ] No crashes or permission issues

---

### Task 33d: Migrate Coach Tab 
**Effort:** 1 hour | **Priority:** P1 (UX Critical) | **Depends on:** Task 33b
**User Story:** US-COACH-01 - Coach AI Screen in Tabs Context

@step-by-step.md - Move coach AI screen to `(tabs)/coach.tsx` route with state preservation.
**SCOPE:**

**Files:**
- `apps/expo/app/(tabs)/coach.tsx` (create)
- `apps/web/app/(tabs)/coach.tsx` (create)
- `packages/app/features/Coach/CoachScreen.tsx` (may need to remove onBack prop)

**Tasks:**
- [ ] Create tab route wrapping `CoachScreen`
- [ ] Remove/make optional `onBack` prop from CoachScreen
- [ ] Keep `onNavigateToSettings` handler
- [ ] Test message history preserved across tab switches
- [ ] Test scroll position preserved
- [ ] Test input text preserved
- [ ] Test AI typing state preserved
- [ ] Verify custom header works (or remove if not needed)

**Implementation:**
```typescript
import { CoachScreen } from '@app/features/Coach'
import { useRouter } from 'expo-router'
import { AuthGate } from '../../components/AuthGate'

export default function CoachTab() {
  const router = useRouter()

  return (
    <AuthGate>
      <CoachScreen
        onNavigateToSettings={() => 
          router.push('/settings/personalisation')
        }
      />
    </AuthGate>
  )
}
```

**Acceptance Criteria:**
- [ ] Coach screen renders in tab
- [ ] Message history preserved across switches
- [ ] Scroll position preserved
- [ ] Input text preserved
- [ ] AI typing state preserved
- [ ] Settings navigation works

---

### Task 33e: Migrate Insights Tab 
**Effort:** 1 hour | **Priority:** P1 (UX Critical) | **Depends on:** Task 33b
**User Story:** US-INS-01 - Insights Screen in Tabs Context

@step-by-step.md - Move insights screen to `(tabs)/insights.tsx` route with state preservation.

**SCOPE:**

**Files:**
- `apps/expo/app/(tabs)/insights.tsx` (create)
- `apps/web/app/(tabs)/insights.tsx` (create)
- `packages/app/features/Insights/InsightsScreen.tsx` (already exists)

**Tasks:**
- [ ] Create tab route wrapping existing `InsightsScreen`
- [ ] Keep any navigation callbacks (if needed)
- [ ] Test scroll position preserved when switching tabs
- [ ] Test filters/state preserved across tab switches
- [ ] Test data persistence (charts, stats, etc.)
- [ ] Verify header works correctly in tabs context

**Implementation:**
```typescript
import { InsightsScreen } from '@app/features/Insights'
import { useRouter } from 'expo-router'
import { AuthGate } from '../../components/AuthGate'

export default function InsightsTab() {
  const router = useRouter()

  return (
    <AuthGate>
      <InsightsScreen
        onNavigateToVideoAnalysis={(uri) =>
          router.push({ pathname: '/video-analysis', params: { videoUri: uri } })
        }
        onNavigateToSettings={() => router.push('/settings' as any)}
      />
    </AuthGate>
  )
}
```

**Acceptance Criteria:**
- [ ] Insights screen renders in tab
- [ ] Scroll position preserved across tab switches
- [ ] State/filters preserved when switching tabs
- [ ] Navigation to modals works (if applicable)
- [ ] No crashes or errors
- [ ] Works on both native and web

---

### Task 33f: Clean Up & Documentation 
**Effort:** 1 hour | **Priority:** P1 (UX Critical) | **Depends on:** Tasks 33c, 33d, 33e
**User Story:** US-NAV-01 - Migration Completion

@step-by-step.md - Remove old route files, update screen components, and document new tabs architecture.

**SCOPE:**

**Module 1: Delete Old Routes

**Tasks:**
- [ ] Delete `apps/expo/app/index.tsx` (replaced by tabs/record)
- [ ] Delete `apps/expo/app/coach.tsx` (replaced by tabs/coach)
- [ ] Delete `apps/web/app/index.tsx`
- [ ] Delete `apps/web/app/coach.tsx`
- [ ] Keep `apps/expo/app/history-progress.tsx` for now (link from History button)
- [ ] Clean up unused imports

**Module 2: Update Screen Components**

**Tasks:**
- [ ] Make `onTabChange` optional in `CameraRecordingScreen` props
- [ ] Make `onBack` optional in `CoachScreen` props
- [ ] Remove `onNavigateToHistory` from camera screen (use insights tab)
- [ ] Update TypeScript interfaces
- [ ] Remove `handleTabChange` from `useCameraScreenLogic` (make it no-op if still called)
- [ ] Update tests to mock new optional props

**Module 3: Documentation**

**File:** `docs/architecture/navigation-tabs.md` (new)

**Tasks:**
- [ ] Document tabs layout structure
- [ ] Document instant switching benefits
- [ ] Document state preservation behavior
- [ ] Add code examples for each tab
- [ ] Document modal navigation pattern
- [ ] Update AGENTS.md with navigation pattern

**Module 4: Final QA**

**QA Checklist:**
- [ ] **Instant Switching:** Tap between tabs → no animation, instant view change
- [ ] **Coach State:** Type message → switch away → switch back → message preserved
- [ ] **Camera State:** Start camera → switch away → switch back → camera state preserved
- [ ] **Insights State:** Scroll/filter → switch away → switch back → state preserved
- [ ] **Tab Persistence:** Close app → reopen → last tab is active
- [ ] **Modal Navigation:** Video-analysis modal works from any tab
- [ ] **Settings Navigation:** Settings navigation works from Coach/Insights
- [ ] **Performance:** Tab switching < 16ms (feels instant)
- [ ] **No Crashes:** All tabs work without errors

**SUCCESS VALIDATION:**
- [ ] `yarn type-check` passes ✅ (0 errors)
- [ ] `yarn lint` passes ✅ (0 errors)
- [ ] `yarn test` passes ✅ (all tests)
- [ ] Manual QA: All items above verified
- [ ] Performance: Tab switching feels instant (no animation)
- [ ] UX: Matches Instagram/Spotify tab behavior

**Acceptance Criteria:**
- [ ] Old route files deleted
- [ ] Screen component props updated
- [ ] Documentation complete
- [ ] All QA checks pass
- [ ] Type checking passes
- [ ] No broken navigation

**SUMMARY OF ALL SUB-TASKS:**

**Files to Create (across all sub-tasks):**
- `apps/expo/app/(tabs)/_layout.tsx` (Task 33a, enhanced in 33b)
- `apps/expo/app/(tabs)/record.tsx` (Task 33c)
- `apps/expo/app/(tabs)/coach.tsx` (Task 33d)
- `apps/expo/app/(tabs)/insights.tsx` (Task 33e)
- `apps/web/app/(tabs)/_layout.tsx` (Task 33a, enhanced in 33b)
- `apps/web/app/(tabs)/record.tsx` (Task 33c)
- `apps/web/app/(tabs)/coach.tsx` (Task 33d)
- `apps/web/app/(tabs)/insights.tsx` (Task 33e)
- `docs/architecture/navigation-tabs.md` (Task 33f)

**Files to Delete (Task 33f):**
- `apps/expo/app/index.tsx`
- `apps/expo/app/coach.tsx`
- `apps/web/app/index.tsx`
- `apps/web/app/coach.tsx`

**Files to Modify (across all sub-tasks):**
- `apps/expo/app/_layout.tsx` (Task 33a - nest tabs)
- `apps/web/app/_layout.tsx` (Task 33a - nest tabs)
- `packages/app/features/CameraRecording/CameraRecordingScreen.tsx` (Task 33f - optional props)
- `packages/app/features/CameraRecording/types/index.ts` (Task 33f - update interface)
- `packages/app/features/Coach/CoachScreen.tsx` (Task 33f - optional onBack)
- `packages/app/features/CameraRecording/hooks/useCameraScreenLogic.ts` (Task 33f - no-op handleTabChange)

**MIGRATION STRATEGY:**
- Phase 1: Create tabs structure (non-breaking, can test in parallel)
- Phase 2: Migrate one tab at a time (record → coach → insights)
- Phase 3: Update root layout and remove old routes
- Phase 4: Clean up screen components (remove tab navigation logic)

**BENEFITS:**
- ⚡ **Instant Switching**: No animation, < 16ms tab changes
- 💾 **State Preservation**: Scroll, form inputs, playback positions preserved
- 🔙 **No Back Stack Issues**: Tab changes don't add to navigation history
- 📱 **Native Feel**: Matches iOS/Android tab patterns users expect
- 🎯 **Memory Efficient**: React Native optimizes inactive tabs automatically
- 🏆 **Battle-Tested**: Same pattern as Instagram, Spotify, Twitter, etc.

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

### Task 31: Video Thumbnail Cloud Storage Migration [P1] 🔄 PENDING
**Effort:** 1 day | **Priority:** P1 (Future optimization) | **Depends on:** Task 30
**User Story:** US-HI-01a (Videos Section - Horizontal Thumbnail Gallery)

@step-by-step.md - Migrate thumbnail storage from client-side device storage to Supabase Storage with CDN-backed delivery.

**OBJECTIVE:** Move thumbnails from client-side storage (local file URIs/data URLs in `metadata.thumbnailUri`) to Supabase Storage `processed` bucket for CDN-backed delivery, add dedicated `thumbnail_url` column, and update cache retrieval to use cloud URLs.

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
- Storage: Supabase Storage `processed` bucket with public read access
- Database: Dedicated `thumbnail_url` TEXT column with index for performance
- CDN: Automatic via Supabase Storage public URLs
- Cache: Update retrieval to fetch cloud URLs instead of local URIs
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
- [ ] Create migration to add `thumbnail_url TEXT` column
- [ ] Add index on `thumbnail_url` for query performance
- [ ] Update RLS policies (no changes needed - inherits from row policies)
- [ ] Test migration on local Supabase instance
- [ ] Update TypeScript types in `packages/api/types/database.ts`

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
'Public URL to video thumbnail in Supabase Storage (processed bucket)';
```

**Acceptance Criteria:**
- [ ] Migration runs without errors on local Supabase
- [ ] Column accepts NULL and TEXT values
- [ ] Index created successfully
- [ ] TypeScript types updated and type-check passes
- [ ] Existing data unaffected (column defaults to NULL)

#### Module 2: Supabase Storage Upload Service [from Task 30 Module 4]
**Summary:** Upload thumbnail to Supabase Storage `processed` bucket and get CDN URL.

**Cross-reference:** Deferred from Task 30 Module 4 - Supabase Storage Upload

**File:** `packages/api/src/services/videoThumbnailService.ts` (modify shared file)

**Tasks:**
- [ ] Create `uploadVideoThumbnail(thumbnailUri, videoId, userId)` function
- [ ] Upload to `processed/thumbnails/{userId}/{videoId}.jpg`
- [ ] Set content type to `image/jpeg`
- [ ] Get public URL after upload
- [ ] Handle upload failures gracefully with retry logic (retry once)
- [ ] Add structured logging for upload (success/failure/duration)
- [ ] Ensure `processed` bucket exists with public read policy
- [ ] Convert local URI/data URL to blob for upload

**Function Interface:**
```typescript
export async function uploadVideoThumbnail(
  thumbnailUri: string,
  videoId: number,
  userId: string
): Promise<string | null> {
  try {
    const filePath = `thumbnails/${userId}/${videoId}.jpg`
    
    // Convert local URI/data URL to blob for upload
    const response = await fetch(thumbnailUri)
    const blob = await response.blob()
    
    const { data, error } = await supabase.storage
      .from('processed')
      .upload(filePath, blob, {
        contentType: 'image/jpeg',
        upsert: true,
      })
    
    if (error) throw error
    
    const { data: urlData } = supabase.storage
      .from('processed')
      .getPublicUrl(filePath)
    
    return urlData.publicUrl
  } catch (error) {
    logger.error('Failed to upload thumbnail', { videoId, error })
    return null
  }
}
```

**Acceptance Criteria:**
- [ ] Thumbnail uploads successfully to `processed` bucket
- [ ] Public URL returned and accessible via CDN
- [ ] File path uses `thumbnails/{userId}/{videoId}.jpg` structure
- [ ] Upsert enabled (overwrites existing thumbnails)
- [ ] Errors handled gracefully with retry logic
- [ ] Logging captures upload metrics (duration, size, success/failure)
- [ ] Bucket configuration verified (public read access)

#### Module 3: Pipeline Integration
**Summary:** Integrate cloud upload into video upload pipeline after local thumbnail generation.

**Files:**
- `packages/app/services/videoUploadAndAnalysis.ts` (modify)
- `packages/api/src/services/videoUploadService.ts` (modify)

**Tasks:**
- [ ] Call `uploadVideoThumbnail()` after local thumbnail generation in `videoUploadAndAnalysis.ts`
- [ ] Pass cloud URL to `uploadVideo()` instead of local URI
- [ ] Store cloud URL in `thumbnail_url` column (not `metadata.thumbnailUri`)
- [ ] Maintain backward compatibility: keep `metadata.thumbnailUri` for local fallback
- [ ] Maintain non-blocking behavior (upload failures don't crash pipeline)
- [ ] Add structured logging for cloud upload step

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
- [ ] Cloud upload runs after local thumbnail generation
- [ ] Public URL stored in `thumbnail_url` column
- [ ] Local URI still stored in `metadata.thumbnailUri` (fallback)
- [ ] Pipeline doesn't fail if cloud upload fails
- [ ] Graceful degradation to local URI if cloud unavailable
- [ ] Structured logging for debugging

#### Module 4: Cache Retrieval Update
**Summary:** Update cache retrieval to prefer cloud URLs over local URIs.

**File:** `packages/app/features/VideoAnalysis/stores/analysisStatus.ts` (modify)

**Tasks:**
- [ ] Update `setJobResults()` to read `thumbnail_url` column first
- [ ] Fallback to `metadata.thumbnailUri` if `thumbnail_url` is null (backward compatibility)
- [ ] Update `historyStore.updateCache()` to use cloud URL when available
- [ ] Add null checks for missing thumbnails
- [ ] Add logging for cache retrieval source (cloud vs local)

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
- [ ] Cache retrieval prefers `thumbnail_url` over `metadata.thumbnailUri`
- [ ] Fallback to `metadata.thumbnailUri` works for old records
- [ ] Cache stores cloud URL correctly
- [ ] VideosSection displays thumbnails from cloud URLs (CDN)
- [ ] Backward compatibility maintained for existing records

#### Module 5: Test Suite
**Summary:** Unit tests for cloud storage upload.

**File:** `packages/api/src/services/videoThumbnailService.test.ts` (extend existing tests)

**Tasks:**
- [ ] Test successful cloud upload (native + web platforms)
- [ ] Test upload failure handling with retry
- [ ] Test public URL generation
- [ ] Test blob conversion from local URI and data URL
- [ ] Test upsert behavior (overwrites existing)
- [ ] Mock Supabase Storage client

**Acceptance Criteria:**
- [ ] All tests pass (existing 9 + new cloud upload tests)
- [ ] Cloud upload logic tested separately from local generation
- [ ] Error cases covered (network failures, bucket errors, auth failures)
- [ ] Retry logic verified (1 retry attempt)
- [ ] Platform-specific blob conversion tested

#### Module 6: Manual QA
**Summary:** End-to-end validation of cloud storage migration.

**Tasks:**
- [ ] Record video → thumbnail uploaded to Supabase Storage
- [ ] Verify `thumbnail_url` populated in database
- [ ] Verify cloud URL is publicly accessible (CDN)
- [ ] VideosSection displays thumbnails from cloud URLs
- [ ] Upload pipeline succeeds even if cloud upload fails
- [ ] Thumbnail load time < 500ms (CDN benefit)
- [ ] Old records with `metadata.thumbnailUri` still work (backward compatibility)
- [ ] Verify bucket storage quota usage

**SUCCESS VALIDATION:**
- [ ] `yarn type-check` passes ✅ (0 errors)
- [ ] `yarn workspace @my/api test videoThumbnailService.test.ts --run` → all tests pass
- [ ] `yarn lint` passes ✅ (0 errors)
- [ ] Manual QA: All items above verified
- [ ] Performance: Cloud thumbnail load < 500ms (CDN)
- [ ] Storage: Thumbnails visible in Supabase Storage dashboard

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
- Supabase Storage `processed` bucket must be configured with public read access
- Database migration must run before code deployment
- Backward compatibility maintained throughout migration

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

