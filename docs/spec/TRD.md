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

**Current (Phase 2 — leaf subscriptions):** `VideoAnalysisScreen` owns logic-only hooks and passes stable props to layout; all store subscriptions live in leaf sections. Video/audio controllers are created inside `VideoPlayerSection`; feedback/panel state is subscribed inside `FeedbackSection`. `useFeedbackAudioSource` writes audio URLs/errors into `useFeedbackAudioStore`; coordinators read store snapshots via `getState()` (no subscriptions).

### VideoAnalysisScreen Architecture

```typescript
function VideoAnalysisScreen(props: VideoAnalysisScreenProps) {
  useStatusBar(true, 'fade')

  const historical = useHistoricalAnalysis(props.analysisJobId ?? null)
  const analysisState = useAnalysisState(
    props.analysisJobId,
    props.videoRecordingId,
    normalizedInitialStatus,
    Boolean(props.analysisJobId)
  )

  const feedbackAudioSource = useFeedbackAudioSource(analysisState.feedback.feedbackItems)
  const feedbackCoordinator = useFeedbackCoordinator(...)
  const animation = useAnimationController()
  const gesture = useGestureController(
    animation.scrollY,
    animation.feedbackContentOffsetY,
    animation.scrollRef,
    isProcessing
  )

  return (
    <VideoAnalysisLayout
      video={videoState}
      feedback={feedback}
      subscription={{ key: subscriptionKey, shouldSubscribe: !isHistoryMode }}
      handlers={handlers}
      gesture={gesture}
      animation={animation}
      videoUri={videoState.uri}
      audioOverlay={{
        onClose: feedbackCoordinator.onAudioOverlayClose,
        onInactivity: feedbackCoordinator.onAudioOverlayInactivity,
        onInteraction: feedbackCoordinator.onAudioOverlayInteraction,
      }}
      controls={{ onControlsVisibilityChange: handleControlsVisibilityChange }}
      videoControlsRef={videoControlsRef}
      error={error}
    />
  )
}
```

### Hook & Section Responsibilities

| Area | Responsibility | Notes |
|------|----------------|-------|
| `useStatusBar` | Status bar visibility | Logic-only |
| `useHistoricalAnalysis` | Load cached analysis + title/uri | History mode support |
| `useAnalysisState` | Analysis phase/progress/errors | Normalizes initial status |
| `useFeedbackAudioSource` | Resolve audio URLs/errors + cache | Writes to `useFeedbackAudioStore` |
| `useFeedbackCoordinator` | Feedback coordination (imperative) | Reads store snapshots only |
| `useAnimationController` | Animated values for layout | Shared with gesture |
| `useGestureController` | Pan/scroll controls + scroll refs | Disables when processing |
| `VideoPlayerSection` | Owns `useVideoPlayer` + `useAudioControllerLazy`; subscribes to playback/audio/coach/persistent progress stores | Only this section re-renders on playback/audio changes |
| `FeedbackSection` | Owns `useFeedbackPanel` + command bus; subscribes to highlighted feedback + audio URLs/errors | Handles tab state and selection locally |

### Zustand Stores

| Store | Purpose | Subscription Location |
|-------|---------|-----------------------|
| `useVideoPlayerStore` | Playback timeline, duration, pending seek, display time | `VideoPlayerSection` (read/write); screen uses setters via refs only |
| `useFeedbackAudioStore` | `audioUrls`, `errors`, `activeAudio`, cached paths | Written by `useFeedbackAudioSource`; read by `VideoPlayerSection` + `FeedbackSection` |
| `useFeedbackCoordinatorStore` | `highlightedFeedbackId`, `isCoachSpeaking`, `bubbleState`, `overlayVisible` | `VideoPlayerSection` + `FeedbackSection`; coordinator reads via `getState()` |
| `usePersistentProgressStore` | Persistent progress bar props/visibility | `VideoPlayerSection` |
| `useFeedbackPanelCommandStore` | Command bus for tab switching | `FeedbackSection` |

### Benefits Over Orchestrator Pattern

- Screen re-renders ~0–1 times per feedback tap (subscriptions moved to leaf nodes).
- Video/audio sync lives in `VideoPlayerSection`; screen stays dark during playback changes.
- Feedback selection/tab changes stay in `FeedbackSection`; no screen-level subscriptions.
- Coordinators read imperative store snapshots for overlays and progress without subscribing.

### Memoization Strategy

- Stable handler set split into stable vs reactive; refs bridge to latest state.
- `feedback`/`videoState` exclude fast-changing values (current time, highlighted IDs).
- Audio overlay memoized only by callback refs; real audio state lives in `VideoPlayerSection`.

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
