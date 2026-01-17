# TRD Quick Reference - Solo:Level AI Coach

**Purpose:** Essential tech specs for common development tasks.

## Core Stack

**Clients:** Expo (iOS/Android) + Expo Router (Web) | **Bundler:** Metro | **UI:** Tamagui | **Backend:** Supabase | **State:** Zustand + TanStack Query

## Version Matrix

| Area          | Current        | Minimum | Source |
| ------------- | -------------- | ------- | ------ |
| Node          | 20.x           | 20.x    | `package.json engines.node` |
| Yarn          | 4.10.3         | 4.0.0   | `package.json packageManager` |
| Expo SDK      | 53.0.23        | 53.x    | root `expo` version |
| React Native  | 0.79.6         | 0.79.x  | root `react-native` |
| React         | 19.0.0         | 19.x    | root `react` |
| Expo Router   | 5.1.7          | 5.1.x   | `apps/*/package.json` |
| Turbo         | 1.13.4         | 1.13.x  | root `turbo` |

## Navigation Pattern

**Tabs Layout (Expo Router):**
- File structure: `apps/expo/app/(tabs)/_layout.tsx` with custom `BottomNavigation`
- Routes: `record.tsx` (Camera), `coach.tsx` (AI Chat), `insights.tsx` (Progress)
- State: `useTabPersistence` + `useTabNavigation` hooks (preserves active tab across sessions)
- Benefits: Instant switching (<16ms), state preservation, no back stack pollution
- Pattern: Battle-tested approach matching Instagram/Spotify UX

**Modal Routes (Outside Tabs):**
- `video-analysis.tsx`, `settings/*.tsx`, `history-progress.tsx`, `coaching-session.tsx`
- Present over tabs, return to last active tab on dismiss

**Onboarding Routes:**
- `onboarding/voice-selection.tsx` - Coach voice/mode preferences

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
- **Video Analysis:** Gemini 2.5 Flash → Pro (with 120s timeout protection)
- **Feedback Generation:** Gemini 2.5 LLM (text + SSML)
- **TTS:** Gemini 2.5 → MP3/WAV
- **Architecture:** Split pipeline (2 Edge Function invocations to prevent wall clock timeout)

## Data Flow

```
Phase 1 - Video Analysis (Edge Function 1):
Client → Upload raw video → Supabase Storage (raw bucket)
      → Call ai-analyze-video Edge Function → Returns immediately (job queued)
      → INSERT trigger → Webhook → /ai-analyze-video/webhook (fresh 150s timeout)
      → Edge: Gemini video analysis → Feedback generation → DB
      → Status: analysis_complete (80% progress)
      
Phase 2 - SSML/Audio Generation (Edge Function 2):
      → UPDATE trigger fires → Webhook → /ai-analyze-video/post-analyze (fresh 150s timeout)
      → Edge: SSML generation → TTS audio → Storage (processed bucket)
      → DB: analysis_audio_segments + analysis_ssml_segments
      → Status: completed (100% progress)
      → Realtime: Client subscribes to analysis_jobs UPDATE → UI updates
```

Notes:
- Pipeline split prevents wall clock timeout (55% stuck issue resolved)
- Each phase gets fresh 150s Edge Function invocation
- Uploads create `upload_sessions` rows; progress tracked server-side
- Finalization and job enqueue are handled by Storage/DB webhook logic
- INSERT trigger: `auto-start-analysis-on-upload-completed` 
- UPDATE trigger: `auto_start_post_analysis` (fires when status = 'analysis_complete')

## Database Schema (Simplified)

```sql
-- All tables have RLS enabled with auth.uid() = user_id

profiles (
  user_id, username, created_at,
  coach_gender, coach_mode -- Voice preferences
)

video_recordings (
  id, user_id, storage_path, filename, 
  duration_seconds, source_type, created_at
)

analysis_jobs (
  id, user_id, video_recording_id,
  status, -- 'queued' | 'processing' | 'analysis_complete' | 'completed' | 'failed'
  progress_percentage,
  results jsonb, pose_data jsonb,
  full_feedback_text, summary_text,
  -- Voice snapshot columns (frozen at analysis time)
  coach_gender, coach_mode, voice_name_used, avatar_asset_key_used,
  created_at, updated_at
)

analysis_feedback (
  id, analysis_id, timestamp_seconds,
  category, message, confidence, impact
)

coach_voice_configs (
  id, gender, mode,
  voice_name, tts_system_instruction,
  prompt_voice, prompt_personality,
  avatar_asset_key, is_active
)
```

---

## Hook Composition Pattern

**Current (Phase 2 — leaf subscriptions):** `VideoAnalysisScreen` owns logic-only hooks and passes stable props to layout; all store subscriptions live in leaf sections. Video/audio controllers are created inside `VideoPlayerSection`; feedback/panel state is subscribed inside `FeedbackSection`. `useFeedbackAudioSource` writes audio URLs/errors into `useFeedbackAudioStore`; coordinators read store snapshots via `getState()` (no subscriptions).

### VideoAnalysisScreen Architecture (~825 LOC)

```typescript
function VideoAnalysisScreen(props: VideoAnalysisScreenProps) {
  // Batch 1: Independent hooks
  useStatusBar(true, 'fade')
  const historical = useHistoricalAnalysis(isHistoryMode ? analysisJobId : null)

  // Batch 2: Single-dependency hooks
  const analysisState = useAnalysisState(...)
  const feedbackAudioSource = useFeedbackAudioSource(feedbackItems)

  // PERF FIX: Store setters via refs (no subscriptions)
  const setIsPlaying = useVideoPlayerStore((state) => state.setIsPlaying)
  const videoPlaybackForCoordinator = useMemo(() => ({
    get pendingSeek() { return pendingSeekRef.current },
    play: () => setIsPlaying(true),
    // ... other stable methods
  }), [setIsPlaying, ...])

  // Batch 3: Complex coordinator
  const feedbackCoordinator = useFeedbackCoordinator({
    feedbackItems,
    audioController: minimalAudioController,
    videoPlayback: videoPlaybackForCoordinator,
  })

  // Batch 4: Native-only hooks
  const animation = useAnimationController()
  const gesture = useGestureController(...)

  return (
    <VideoAnalysisLayout
      video={videoState}
      feedback={feedback}
      handlers={handlers}
      gesture={gesture}
      animation={animation}
      audioOverlay={audioOverlay}
      subscription={{ key: subscriptionKey, shouldSubscribe: !isHistoryMode }}
      // ... controls, error, voiceMode
    />
  )
}
```

### Hook & Section Responsibilities

| Area | Responsibility | Notes |
|------|----------------|-------|
| `useStatusBar` | Status bar visibility | Logic-only |
| `useHistoricalAnalysis` | Load cached analysis + title/uri + backfill avatar | History mode support |
| `useAnalysisState` | Analysis phase/progress/errors | Normalizes initial status |
| `useFeedbackAudioSource` | Resolve audio URLs/errors + cache | Writes to `useFeedbackAudioStore` |
| `useFeedbackCoordinator` | Feedback coordination (imperative) | Reads store snapshots only via `getState()` |
| `useAnimationController` | Animated values for layout | Shared with gesture |
| `useGestureController` | Pan/scroll controls + scroll refs | Disables when processing |
| `VideoPlayerSection` | Owns `useVideoPlayer` + `useAudioControllerLazy`; subscribes to playback/audio/coach/persistent progress stores | Only this section re-renders on playback/audio changes |
| `FeedbackSection` | Owns `useFeedbackPanel` + command bus; subscribes to highlighted feedback + audio URLs/errors | Handles tab state and selection locally |

### Zustand Stores

| Store | Purpose | Subscription Location |
|-------|---------|-----------------------|
| `useVideoPlayerStore` | Playback timeline, duration, pending seek, display time, manual controls visibility | `VideoPlayerSection` (read/write); screen uses setters via refs only |
| `useFeedbackAudioStore` | `audioUrls`, `errors`, `activeAudio`, `audioPaths` (persisted), `controller` | Written by `useFeedbackAudioSource`; read by `VideoPlayerSection` + `FeedbackSection` |
| `useFeedbackCoordinatorStore` | `highlightedFeedbackId`, `selectedFeedbackId`, `isCoachSpeaking`, `bubbleState`, `overlayVisible` | `VideoPlayerSection` + `FeedbackSection`; coordinator reads via `getState()` |
| `usePersistentProgressStore` | Persistent progress bar props/visibility | `VideoPlayerSection` |
| `useFeedbackPanelCommandStore` | Command bus for tab switching | `FeedbackSection` |
| `useVideoHistoryStore` | Cached analyses, thumbnails, UUID mappings (persisted to MMKV) | `HistoryProgressScreen`, `VideoAnalysisScreen` |
| `useVoicePreferencesStore` | User voice preferences (gender, mode) | `VideoAnalysisScreen`, onboarding |

### Benefits Over Orchestrator Pattern

- Screen re-renders ~0–1 times per feedback tap (subscriptions moved to leaf nodes).
- Video/audio sync lives in `VideoPlayerSection`; screen stays dark during playback changes.
- Feedback selection/tab changes stay in `FeedbackSection`; no screen-level subscriptions.
- Coordinators read imperative store snapshots for overlays and progress without subscribing.
- Refs bridge stable handlers to latest state (no dependency array churn).

### Memoization Strategy

- Stable handler set split into stable vs reactive; refs bridge to latest state.
- `feedback`/`videoState` exclude fast-changing values (current time, highlighted IDs).
- Audio overlay memoized only by callback refs; real audio state lives in `VideoPlayerSection`.
- Voice preferences read via granular selectors for avatar fallback.

**Also used in codebase:**
- `upload_sessions` - tracks signed upload progress
- `analysis_audio_segments` - per-feedback audio file references
- `analysis_ssml_segments` - per-feedback SSML text storage
- `analysis_metrics` - analysis timing/performance data
- `analyses` - normalized analysis results (uuid PK, references job_id)
- `user_feedback` - in-app user feedback submissions

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
// Edge Functions: /functions/v1/

// ai-analyze-video - Split pipeline architecture (2 phases)

// Phase 1: Create job (INSERT trigger starts video analysis)
POST /ai-analyze-video
  Body: { videoRecordingId: number, videoSource?: 'live_recording' | 'uploaded_video' }
  Response: { analysisId: number, status: 'queued', message: 'Processing will start automatically' }
  Security: userId extracted from JWT (server-side)
  Handler: handleStartAnalysis (creates job, returns immediately)
  Note: INSERT trigger calls /webhook which runs video analysis

// Phase 1 (Webhook): Video analysis only
POST /ai-analyze-video/webhook
  Triggered by INSERT trigger on analysis_jobs
  Handler: handleWebhookStart (fresh 150s timeout)
  Process: Gemini video analysis → feedback generation → status = 'analysis_complete'
  Note: AbortController with 120s timeout on Gemini API call

// Phase 2 (Webhook): SSML + Audio generation  
POST /ai-analyze-video/post-analyze
  Triggered by UPDATE trigger when status = 'analysis_complete'
  Handler: handlePostAnalyze (fresh 150s timeout)
  Process: SSML generation → TTS audio → status = 'completed'
  Security: DB webhook secret validation

GET /ai-analyze-video/status?id=<id>
  Response: { id, status, progress, error?, results? }
  Handler: handleStatus
  Note: status includes 'analysis_complete' (video done, SSML/audio pending)

POST /ai-analyze-video/tts
  Body: { ssml?: string, text?: string, format?: 'mp3'|'wav' }
  Response: { audioUrl: string, duration?: number, format: string }
  Handler: handleTTS

// Dev/test endpoints
GET /ai-analyze-video/test-env
POST /ai-analyze-video/upload-test

// storage-upload-finalize - Handles upload session finalization
POST /storage-upload-finalize
  Triggered by Storage webhooks

// admin-auth - Admin authentication utilities
POST /admin-auth
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
- Upload: `packages/app/features/VideoAnalysis/stores/uploadProgress.ts`
- Video Player: `packages/app/features/VideoAnalysis/stores/videoAnalysisPlaybackStore.ts`
- Feedback Audio: `packages/app/features/VideoAnalysis/stores/feedbackAudio.ts`
- Feedback Coordinator: `packages/app/features/VideoAnalysis/stores/feedbackCoordinatorStore.ts`
- Video History: `packages/app/features/HistoryProgress/stores/videoHistory.ts`
- Voice Preferences: `packages/app/stores/voicePreferences.ts`

**Screens:**
- Sign-in: `apps/expo/app/auth/sign-in.tsx`, `apps/web/app/auth/sign-in.tsx`
- Tabs: `apps/expo/app/(tabs)/[record|coach|insights].tsx`
- Video Analysis: `packages/app/features/VideoAnalysis/VideoAnalysisScreen.tsx`
- History Progress: `packages/app/features/HistoryProgress/HistoryProgressScreen.tsx`
- Voice Selection: `packages/app/features/Onboarding/VoiceSelectionScreen.tsx`

**Edge Functions:**
- Main: `supabase/functions/ai-analyze-video/index.ts`
- Route handlers: `supabase/functions/ai-analyze-video/routes/`
  - `handleStartAnalysis.ts`: Creates job, returns immediately
  - `handleWebhookStart.ts`: Phase 1 - Video analysis (triggered by INSERT)
  - `handlePostAnalyze.ts`: Phase 2 - SSML + Audio (triggered by UPDATE)
- Pipeline: `supabase/functions/_shared/pipeline/aiPipeline.ts` (video-only)
- Workers: 
  - `supabase/functions/ai-analyze-video/workers/ssmlWorker.ts`
  - `supabase/functions/ai-analyze-video/workers/audioWorker.ts`
- TTS: `supabase/functions/_shared/gemini/tts.ts`
- Gemini: `supabase/functions/_shared/gemini/generate.ts` (with 120s timeout)
- LLM Analysis: `supabase/functions/ai-analyze-video/gemini-llm-analysis.ts`
- SSML Feedback: `supabase/functions/ai-analyze-video/gemini-ssml-feedback.ts`
- Logger: `supabase/functions/_shared/logger.ts`
- Voice config: `supabase/functions/_shared/db/voiceConfig.ts`

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
