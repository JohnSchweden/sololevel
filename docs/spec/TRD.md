# TRD Quick Reference - Solo:Level AI Coach

**Purpose:** Essential tech specs for common development tasks.

## Core Stack

**Clients:** Expo (iOS/Android) + Expo Router (Web) | **Bundler:** Metro | **UI:** Tamagui | **Backend:** Supabase | **State:** Zustand + TanStack Query

## Navigation Pattern

**Tabs Layout (Expo Router):**
- File structure: `apps/expo/app/(tabs)/_layout.tsx` with custom `BottomNavigation`
- Routes: `record.tsx` (Camera), `coach.tsx` (AI Chat), `insights.tsx` (Progress)
- State: `useTabPersistence` hook with AsyncStorage (preserves active tab across sessions)
- Benefits: Instant switching (<16ms), state preservation, no back stack pollution
- Pattern: Battle-tested approach matching Instagram/Spotify UX

**Modal Routes (Outside Tabs):**
- `video-analysis.tsx`, `settings/*.tsx`, `history-progress.tsx`
- Present over tabs, return to last active tab on dismiss

## Platform Implementations

### Native (iOS/Android)
- **Camera/Pose:** react-native-vision-camera + react-native-fast-tflite (MoveNet Lightning)
- **Video:** react-native-video-processing (frame extraction), react-native-video (playback)
- **Overlay:** react-native-skia (pose landmarks)
- **Threading:** react-native-worklets-core

### Web
- **Camera/Pose:** @tensorflow-models/pose-detection (MoveNet Lightning) + tfjs-backend-webgpu
- **Video:** MediaRecorder API + HTML5 `<video>`
- **Overlay:** WebGL Canvas + OffscreenCanvas
- **Workers:** Web Workers for pose processing

### AI Pipeline
- **Video Analysis:** Gemini 2.5 Flash → Pro
- **Feedback Generation:** Gemini 2.5 LLM (text + SSML)
- **TTS:** Gemini 2.5 → MP3/WAV

## Data Flow

```
Client → Upload raw video → Supabase Storage (raw bucket)
      → Call ai-analyze-video Edge Function (receives job id)
      → Edge: Gemini video analysis → LLM feedback → TTS audio → Storage (processed bucket)
      → DB: analysis_jobs + analysis_feedback + audio segments
      → Realtime: Client subscribes to analysis_jobs UPDATE → UI updates
```

Notes:
- Uploads create `upload_sessions` rows; progress tracked server-side.
- Finalization and job enqueue are handled by Storage/DB webhook logic.

## Database Schema (Simplified)

```sql
-- All tables have RLS enabled with auth.uid() = user_id

profiles (user_id, username, created_at)

video_recordings (
  id, user_id, storage_path, filename, 
  duration_seconds, source_type, created_at
)

analysis_jobs (
  id, user_id, video_recording_id,
  status, progress_percentage,
  results jsonb, pose_data jsonb,
  full_feedback_text, summary_text,
  created_at, updated_at
)

analysis_feedback (
  id, analysis_job_id, timestamp_seconds,
  category, message, confidence, impact
)
```

---

## Hook Composition Pattern

**Migration:** Replaced orchestrator pattern with direct hook composition (see ADR 005).

**Architecture Diagram:** See `docs/spec/video-analysis-screen-architecture.mermaid` for visual hook dependency graph.

### VideoAnalysisScreen Architecture

```typescript
// Direct hook composition - each hook owns one concern
function VideoAnalysisScreen(props: VideoAnalysisScreenProps) {
  // Core video state
  const videoPlayback = useVideoPlayback(initialStatus)
  const videoControls = useVideoControls(...)
  const videoAudioSync = useVideoAudioSync(...)

  // Audio management
  const audioController = useAudioController(audioUrl)
  const feedbackAudioSource = useFeedbackAudioSource(feedbackItems)

  // Feedback coordination
  const analysisState = useAnalysisState(...)
  const feedbackPanel = useFeedbackPanel()
  const feedbackCoordinator = useFeedbackCoordinator(...)

  // Zustand stores (granular subscriptions)
  const highlightedFeedbackId = useFeedbackCoordinatorStore(s => s.highlightedFeedbackId)
  const bubbleState = useFeedbackCoordinatorStore(s => s.bubbleState)
  const overlayVisible = useFeedbackCoordinatorStore(s => s.overlayVisible)
  const setPersistentProgressProps = usePersistentProgressStore(s => s.setProps)

  // Native-only (animations and gestures)
  const gesture = useGestureController(...)
  const animation = useAnimationController()

  // Compose props and render layout
  return <VideoAnalysisLayout
    video={videoState}
    playback={playback}
    audio={audio}
    feedback={feedback}
    handlers={handlers}
    // ... other props
  />
}
```

### Hook Responsibilities

| Hook | Responsibility | Dependencies |
|------|-----------------|--------------|
| `useVideoPlayback` | Video playback control + state | initialStatus |
| `useVideoControls` | Controls visibility + visibility changes | isProcessing, video state |
| `useVideoAudioSync` | Audio/video sync coordination | video + audio states |
| `useAudioController` | Audio playback control | audio URL |
| `useFeedbackAudioSource` | Feedback audio URL + error management | feedbackItems |
| `useAnalysisState` | Analysis phase + progress + errors | analysis job ID, videoRecordingId |
| `useFeedbackPanel` | Panel state (expanded, tab, selection) | none |
| `useFeedbackCoordinator` | Feedback interaction + audio overlay | video + audio + panel |
| `useHistoricalAnalysis` | Historical analysis data loading | analysisJobId |
| `useAutoPlayOnReady` | Auto-play when analysis completes | isProcessing, video state |
| `useGestureController` | Pan gesture + scroll handling | animation refs |
| `useAnimationController` | Animated values for layout animations | none |
| `useStatusBar` | Status bar visibility control | none |

### Zustand Stores

| Store | Purpose | Usage Pattern |
|-------|---------|---------------|
| `useFeedbackCoordinatorStore` | Granular feedback coordinator state (highlightedFeedbackId, bubbleState, overlayVisible, activeAudio) | Granular selectors to prevent re-renders |
| `usePersistentProgressStore` | Persistent video progress tracking | Set/get progress props |

### Benefits Over Orchestrator Pattern

**Before:** 1 God Hook (1789 LOC, 14 nested hooks, 49 memoization layers)
```
- Hard to test (need 14 mocks)
- Tight coupling (everything depends on everything)
- Defensive memoization (trying to prevent re-renders)
- Difficult debugging (complex data flow)
```

**After:** 13 Focused Hooks + Zustand Stores (direct composition, ~611 LOC)
```
- Easy to test (mock individual hooks)
- Loose coupling (each hook independent)
- Minimal memoization (only where needed)
- Clear debugging (direct data flow)
- Granular Zustand subscriptions prevent re-render cascades
```

### Memoization Strategy

- **Keep:** Stable references that affect layout rendering (bubble state, audio overlay)
- **Remove:** Defensive memoization compensating for aggregation
- **Result:** 90% reduction (49 → 5 instances)

### Adding New Features

1. Create focused hook: `useMyNewFeature()`
2. Call in `VideoAnalysisScreen`
3. Compose props to `VideoAnalysisLayout`
4. Update layout to use new prop
5. Test hook in isolation

No need to touch complex orchestrator logic!

Also used in codebase:
- upload_sessions (tracks signed upload progress)
- analysis_audio_segments, analysis_ssml_segments, analysis_metrics
- analyses

**Storage Buckets:**
- `raw`: User videos (500MB max, authenticated uploads)
- `processed`: AI artifacts (service-role only; audio and generated assets)
- `thumbnails`: Generated thumbnails (optional/CDN-backed)
- Path format examples:
  - Raw video: `userId/timestamp_filename.mp4`
  - Processed audio: `processed/audio/analysis_<id>/...`
  - Thumbnails: `thumbnails/<userId>/<videoId>.jpg`

## API Endpoints

```typescript
// Edge Function: /functions/v1/ai-analyze-video

POST /ai-analyze-video
  Body: { videoPath: string, videoSource?: 'live_recording' | 'uploaded_video' }
  Response: { analysisId: number, status: 'queued' }
  Security: userId extracted from JWT (server-side)

GET /ai-analyze-video/status?id=<id>
  Response: { id, status, progress, error?, results? }

POST /ai-analyze-video/tts
  Body: { ssml?: string, text?: string, format?: 'mp3'|'wav' }
  Response: { audioUrl: string, duration?: number, format: string }

GET /ai-analyze-video/health
  Response: { status: 'ok'|'warning', version, message }
 
// Internal/dev endpoints implemented
GET /ai-analyze-video/test-env
POST /ai-analyze-video/webhook
POST /ai-analyze-video/upload-test
```

## Authentication

**Implementation:**
- Client: `packages/api/src/auth/authClient.ts` (typed wrapper)
- Hook: `packages/app/hooks/useAuth.ts` (React + Zustand)
- Store: `packages/app/stores/auth.ts` (global state)

**Route Protection:**
- Both platforms: `AuthGate` component → redirects to `/auth/sign-in`
- Static export: No server middleware (client-side only)

**Test Auth:** Prefer `EXPO_PUBLIC_TEST_AUTH_ENABLED=true` (Expo/Web). Fallback `TEST_AUTH_ENABLED=true` is also supported.

## Security Rules

1. **RLS Enforced:** All tables filter by `(select auth.uid()) = user_id`
2. **Edge Functions:** Extract userId from JWT (no client trust)
3. **Storage:** Signed URLs with short TTL
4. **Helpers:** Use `packages/api/src/utils/rlsHelpers.ts` for compliance

## Key File Locations

**Auth:**
- Client: `packages/api/src/auth/authClient.ts`
- Hook: `packages/app/hooks/useAuth.ts`
- Store: `packages/app/stores/auth.ts`
- Error mapping: `packages/api/src/auth/authErrorMapping.ts`

**State:**
- Upload: `packages/app/stores/uploadProgress.ts`
- Analysis: `packages/app/stores/analysis.ts`

**Screens:**
- Sign-in: `apps/expo/app/auth/sign-in.tsx`, `apps/web/app/auth/sign-in.tsx`
- Tabs: `apps/expo/app/(tabs)/[record|coach|insights].tsx`
- Video Analysis: `packages/app/features/VideoAnalysis/VideoAnalysisScreen.tsx`

**Edge Functions:**
- Main: `supabase/functions/ai-analyze-video/index.ts`
- TTS: `supabase/functions/_shared/gemini/tts.ts`
- Logger: `supabase/functions/_shared/logger.ts`
- Audio config: `supabase/functions/_shared/media/audio.ts`

## Performance Targets

- Analysis: < 10s median for 60s videos
- App launch: < 3s
- Upload: Resumable with retry + progress tracking

## Error Handling

- Client: Discriminated unions in hooks
- Edge: Zod validation, structured error codes, correlation IDs
- Logging: User-safe messages, no provider detail leaks

## Realtime Updates

```typescript
// Subscribe to analysis job
supabase
  .channel('analysis')
  .on('postgres_changes', 
    { event: 'UPDATE', schema: 'public', table: 'analysis_jobs', filter: `id=eq.${id}` },
    (payload) => { /* update UI */ }
  )
  .subscribe()
```

**Fallback:** Polling with exponential backoff (1s → 2s → 4s → max 30s)

---

**PRD:** `docs/spec/PRD.md`
