# Technical Requirements Document: Solo:Level MVP - AI Feedback Coach App

## Title Page
* **Product Name**: Solo:Level — Upskill Differently
* **Document Title**: "Technical Design Document for Solo:Level MVP"
* **Version**: 0.1 (MVP)
* **Authors**: Yevgen Schweden (PM), Engineering Team
* **Date**: 2025-08-26
* **Approvals**: TBD (PM, Eng Lead, AI Lead)

---

## Executive Summary
* **Purpose**: Specify the end-to-end technical design for the Solo:Level MVP that delivers instant, multi‑modal AI feedback on short user videos across iOS/Android/Web.
* **Scope**: Covers client apps (Expo + Next.js), backend (Supabase, Edge Functions), AI analysis (pose/video/voice/LLM), storage, security, monitoring, and release plan. 
* **Out of Scope**: monetization, marketplace, advanced analytics beyond trends.
* **Audience**: Engineers, QA, PM, Design, DevOps.

---

## Introduction
* **Background**: Users want immediate, actionable feedback on performance activities (speaking, movement, delivery). Manual coaching is slow and expensive.
* **Problem Statement**: Deliver consistent, actionable feedback within < 10s for user-submitted videos, in engaging formats (text, audio, metrics) on mobile-first UX.
* **Objectives**:
  - TTFB feedback < 10s for 60s videos
  - Upload and record flows that are robust on mobile networks
  - Clear, memorable feedback: summary, audio commentary, quantitative metrics
  - Track progress over time per user

---

## Requirements
* **Functional Requirements**:
  1. Video capture or upload (MP4/MOV), max 60s; show duration and size
  2. Background upload to Supabase Storage `raw` bucket with progress and retry
  3. AI analysis pipeline (video + LLM feedback + TTS audio) via Edge Function
  4. Feedback surface: text summary, per-feedback SSML/audio commentary, metrics/radar
  5. History list and detail views with share options
  6. Auth (email/social) and basic profile
* **Non-Functional Requirements**:
  - Performance: analysis < 10s median; app launch < 3s
  - Reliability: upload retries, resumable uploads, idempotent jobs
  - Security: RLS on all tables, signed URLs short TTL, PII minimization
  - Accessibility: WCAG 2.2 AA for web, RN accessibility roles/labels for native
  - Observability: structured logs, error correlation IDs, basic metrics
* **User Stories/Use Cases**:
  - See user stories in the folder docs/spec/user_strories/

---

## System Architecture
* **High-Level Architecture Diagram**:

```mermaid
flowchart TD
  A[Expo App (iOS/Android)] -- TanStack Query/Auth --> S[(Supabase)]
  W[Next.js Web] -- TanStack Query/Auth --> S
  A -- Upload --> ST[(Supabase Storage: raw/processed)]
  W -- Upload --> ST
  A & W -- Invoke --> EF[Edge Functions: ai-analyze-video (subroutes)]
  EF -- Read/Write --> ST
  EF -- Read/Write --> DB[(PostgreSQL)]
  EF -- Call --> AI[AI Providers (Pose/ASR/LLM/TTS)]
  DB <-- Realtime --> A
  DB <-- Realtime --> W
```

* **Technology Stack**:
  - See `core/monorepo-foundation.mdc` for general tech stack (Expo + Next.js, Tamagui, Zustand, TanStack Query, Expo Router, TypeScript, Yarn 4 + Turbo)
  - **Product-specific AI Pipeline**: Real-time pose detection + Video analysis + LLM feedback + TTS generation

## **Native Platform Stack (iOS/Android):**

### **1. Camera & Pose Detection**
* **Primary:** `react-native-vision-camera` v4+ 
* **Pose Engine:** `react-native-fast-tflite` v1.6.1 + **MoveNet Lightning** (replacing ML Kit)
* **Model:** `movenet_lightning_int8.tflite` for optimal performance
* **Overlay:** `react-native-skia` for pose landmarks rendering
* **Recording:** VisionCamera's built-in recording capabilities
* **Threading:** `react-native-worklets-core` for native thread processing

### **2. Video Processing & Analysis**
* **Upload Processing:** `react-native-video-processing` v2+ for frame extraction and pose detection
* **Frame Extraction:** Real-time frame-by-frame processing with configurable intervals (30fps default)
* **Pose Detection Pipeline:** Same MoveNet Lightning model for consistency with live recording
* **Data Format:** Unified `PoseDetectionResult[]` structure matching VisionCamera recording format
* **Performance:** Background processing with progress callbacks and memory optimization
* **Threading:** Worklet-based processing to avoid blocking UI during analysis

### **3. Video Playback & Overlay**
* **Primary:** `react-native-video` v6+
* **Overlay:** `react-native-skia` for pose landmarks rendering
* **Performance:** Native-threaded overlay synchronization

## **Web Platform Stack:**

### **1. Camera & Pose Detection (Leveraging Native Insights)**

#### **Primary Engine: TensorFlow.js with MoveNet (Unified with Native)**
* **Model:** `@tensorflow-models/pose-detection` with **MoveNet Lightning** (same as native!)
* **Backend:** `@tensorflow/tfjs-backend-webgpu` with WebGL fallback
* **Processing:** Web Workers with **OffscreenCanvas** for native-like performance
* **Camera:** Enhanced getUserMedia() API with **ImageCapture** for better frame control

#### **Overlay Rendering (Native-Inspired)**
* **Primary:** **OffscreenCanvas + Web Workers** (mimicking native threading)
* **Rendering:** RequestAnimationFrame with **frame-perfect synchronization**
* **Optimization:** Canvas pooling and GPU-accelerated transforms

### **2. Video Recording & Processing**
* **Primary:** MediaRecorder API with **configurable bitrates**
* **Processing:** **Dedicated Web Workers** for pose detection during recording
* **Streaming:** Real-time pose data streaming to match native performance

### **3. Video Playback & Overlay**
* **Primary:** HTML5 `<video>` with **frame control**
* **Overlay:** **WebGL-accelerated Canvas** with GPU transforms
* **Sync:** **High-resolution timer** + video currentTime for frame-perfect alignment

## **Shared Components:**
* **State Management:** Zustand stores for pose data, performance metrics, and recording state
* **Data Compression:** Optimized pose data storage and transmission
* **File Management:** expo-file-system for videos and pose data export
* **Local Storage:** AsyncStorage for user preferences, SQLite for pose data
* **Video Analysis:** Gemini flash 2.5 first then pro 2.5
* **Voice Analysis:** Optional ASR/Voice metrics processing
* **MMM Integration:** Gemini 2.5 text feedback generation together with video analysis
* **TTS Pipeline:** Per-feedback audio commentary via gemini TTS 2.0 → Convert to AAC/MP3 format for optimal mobile/web compatibility
* **Data Flow**:
  1. Client records or selects a video
  2. Client uploads to Storage bucket `raw` via authenticated upload (RLS-enforced user scoping)
  3. Client calls `ai-analyze-video` with storage path; receives job id
  4. Edge function extracts frames, runs pose + voice, calls LLM, generates feedback + SSML/TTS per feedback item, converts audio to MP3/WAV, writes to DB and `processed` storage
  5. Client subscribes to analysis row via Realtime; UI updates when complete
* **Third-Party Integrations**:
  - **Native**: TensorFlow Lite + MoveNet Lightning model
  - **Web**: TensorFlow.js + MoveNet Lightning model (unified cross-platform)
  - **TTS Provider**: Gemini 2.5 Flash Preview TTS via `_shared/gemini/tts.ts` for audio commentary (output converted to AAC/MP3); modular architecture with shared config and mock support
  - **MMM Provider**: gemini 2.5 for feedback text generation
  - **Performance**: WebGPU/WebGL acceleration for web, native GPU acceleration for mobile

---

## Detailed Design
* **Component Design**:
  - Mobile/Web UI (Tamagui):
    - Capture/Upload Screen: camera permissions, record controls, upload progress
    - Analysis Progress: job state, ETA bar, cancel
    - Feedback Screen: text summary, audio player, radar chart of metrics
    - History Screen: list with date/score, detail navigation
  - Stores (Zustand): `mediaStore` (recording/upload), `analysisStore` (current job/progress), `profileStore`
  - Server State (TanStack Query): `useAnalyzeVideo`, `useAnalysisHistory`, `useAnalysis(analysisId)`

* **Authentication (MVP) ✅ IMPLEMENTED**:
  - **Auth Methods**: Email/password sign-in/out; session restore on app launch; test auth bootstrap for development
  - **UI/Flows**: 
    - `SignIn` screens for Expo (`apps/expo/app/auth/sign-in.tsx`) and Next.js (`apps/next/app/auth/sign-in.tsx`)
    - `AuthGate` components protect routes with loading states and redirect logic
    - Cross-platform routing with Expo Router for both native and web
  - **Client Implementation**:
    - **Auth Client** (`packages/api/src/auth/authClient.ts`): Typed wrapper with error handling and correlation IDs
    - **useAuth Hook** (`packages/app/hooks/useAuth.ts`): React hook with Zustand store integration
    - **Auth Store** (`packages/app/stores/auth.ts`): Global state management with session persistence
  - **Route Protection**:
    - **Expo**: `AuthGate` component with redirect to `/auth/sign-in` and destination preservation
    - **Next.js**: Server-side middleware (`apps/next/middleware.ts`) + client-side `AuthGate` component
    - **Loading States**: No authentication flash/flicker during session restoration
  - **Security/RLS**: 
    - All database operations enforce RLS with `auth.uid()` filtering
    - Edge Functions extract user ID from JWT tokens (no client tampering)
    - RLS Helper utilities (`packages/api/src/utils/rlsHelpers.ts`) ensure compliance
    - User ownership validation prevents cross-user data access
  - **Error Handling**: 
    - Comprehensive error mapping (`packages/api/src/auth/authErrorMapping.ts`)
    - User-friendly messages: `invalid_credentials` → "The email or password you entered is incorrect"
    - Structured logging with email masking and correlation IDs for debugging
  - **Test Auth Mode**:
    - Environment-gated bootstrap (`packages/app/auth/testAuthBootstrap.ts`)
    - Automatic sign-in when `TEST_AUTH_ENABLED=true`
    - Production build guards prevent test auth in production
    - Test user seeding script (`scripts/seedTestUser.mjs`)
  - **Testing** ✅ **45+ Tests Implemented**:
    - **Unit**: Auth client, useAuth hook, auth store, test bootstrap (25+ tests)
    - **Integration**: Route protection, auth flows, RLS enforcement (15+ tests)
    - **E2E**: Playwright pre-authentication with global setup (5+ tests)

* **Authentication (Production, post‑MVP)**:
  - **Providers**: Magic link (OTP) and OAuth (Apple/Google) via Supabase; feature‑flagged rollout
  - **MFA & Sessions**: TOTP MFA, device list, session revocation; notify on new device
  - **Abuse Controls**: Rate limiting, CAPTCHA on suspicious flows, exponential backoff
  - **UX/Intl**: Localized forms/messages, inline validation, skeletons/loading
  - **Security Hardening**: Secure storage on native (expo‑secure‑store), short session TTL + refresh, strict cookies on web
  - **Privacy/Compliance**: Account deletion/data export; consent tracking; retention policies
  - **Observability**: Auth dashboards (success/error rates), alerts on spikes, correlation IDs end‑to‑end

* **Database Schema (Supabase, public schema)**:
  - `profiles` (user_id uuid PK/FK auth.users, username text unique, created_at)
  - `video_recordings` (
      id bigint identity PK,
      user_id uuid FK -> auth.users,
      storage_path text, filename text, original_filename text,
      duration_seconds int, source_type text, created_at timestamptz default now()
    ) RLS enabled
  - `analysis_jobs` (
      id bigint identity PK,
      user_id uuid FK -> auth.users,
      video_recording_id bigint FK -> video_recordings(id) on delete cascade,
      status text check in ('queued','processing','completed','failed'),
      progress_percentage int,
      processing_started_at timestamptz, processing_completed_at timestamptz,
      error_message text,
      results jsonb, pose_data jsonb,
      full_feedback_text text, summary_text text,
      processing_time_ms int, video_source_type text,
      created_at timestamptz default now(), updated_at timestamptz default now()
    ) RLS enabled
  - `analysis_feedback` (
      id bigint identity PK,
      analysis_job_id bigint FK -> analysis_jobs(id) on delete cascade,
      timestamp_seconds numeric,
      category text, message text,
      confidence numeric, impact numeric,
      created_at timestamptz default now()
    ) RLS enabled
  - `analysis_metrics` (optional / Phase 2 analytics)
  - Storage buckets:
    - `raw`: Private bucket for user-uploaded video files (MP4/MOV, 500MB limit, authenticated client uploads with user-scoped RLS)
    - `processed`: Private bucket for AI-generated artifacts (MP3/WAV audio, 100MB limit, service-role only)
  - Policies: select/insert/update restricted to owner `(select auth.uid()) = user_id`

* **Audio Format Configuration (Centralized)**:
  - **Single Source of Truth**: `supabase/functions/_shared/media/audio.ts`
  - **Supported Formats**: `aac` (audio/aac, primary), `mp3` (audio/mpeg)
  - **Provider Capabilities**:
    - Gemini: AAC, MP3
    - Azure: AAC, MP3
    - ElevenLabs: AAC, MP3
  - **Environment Variables**:
    - `SUPABASE_TTS_DEFAULT_FORMAT=aac` (default format for TTS generation)
    - `SUPABASE_TTS_ALLOWED_FORMATS=aac,mp3` (comma-separated allowed formats, AAC primary)
  - **Format Resolution**: `resolveAudioFormat(preferredOrder, provider)` negotiates best format based on preferences and provider capabilities
  - **Storage Paths**: Use `generateAudioStoragePath()` for consistent file naming with proper extensions

* **API Specifications (Edge Functions)** ✅ **UPDATED FOR SECURITY**:
  - `POST /functions/v1/ai-analyze-video`
    - Request: `{ videoPath: string, videoSource?: 'live_recording' | 'uploaded_video' }` 
    - **Security**: `userId` extracted from JWT token server-side (no client tampering)
    - Response: `{ analysisId: number, status: 'queued' }`
  - `GET /functions/v1/ai-analyze-video/status?id=<id>`
    - Response: `{ id, status, progress, error?, results?, summary?, timestamps }`
  - `POST /functions/v1/ai-analyze-video/tts`
    - Request: `{ ssml?: string, text?: string, analysisId?: number, format?: 'mp3'|'aac'|'wav', preferredFormats?: AudioFormat[] }`
    - Response: `{ audioUrl: string, duration?: number, format: AudioFormat }`
  - `GET /functions/v1/ai-analyze-video/health`
    - Response: `{ status: 'ok'|'warning', version, message, env: { supabaseUrl: boolean, supabaseServiceKey: boolean } }`
  - Notes: Prefer Supabase Realtime over polling; status endpoint is a fallback.

* **Client Auth Specifications (Supabase Auth)**:
  - `auth.getSession()` → returns `{ session: Session | null }`
  - `auth.onAuthStateChange((event, session) => void)` → updates global state
  - `auth.signUp({ email, password })` → requires email verification per environment policy
  - `auth.signInWithPassword({ email, password })`
  - `auth.resetPasswordForEmail(email, { redirectTo })`
  - `auth.signOut()`

* **AI Pipeline Flow (Hybrid)**:

```mermaid
flowchart TD
    A[Video Upload] --> B{Video Source}
    B -->|Live Recording| C[VisionCamera Pose Data]
    B -->|Uploaded Video| D[react-native-video-processing]
    D --> E[Client Frame Extraction]
    E --> F[Client MoveNet Pose Detection]
    F --> G[Pose Data Unification]
    C --> G
    G --> H[Edge Video Analysis<br/>Gemini 2.5 (stored video)]
    H --> I[SSML Generation<br/>Gemini LLM]
    I --> J[TTS Generation<br/>Gemini 2.0 → AAC/MP3 in processed]
    J --> K[Store Results (store_enhanced_analysis_results)]
    K --> L[Realtime Update (analysis_jobs UPDATE)]
```

* **Algorithms and Logic (Overview)**:
  1. **Video Source Detection**: Determine if video has existing pose data (live recording) or needs processing (uploaded video)
  2. **Frame Extraction Pipeline**: 
     - Live Recording: Use existing VisionCamera pose data from `PoseDetectionResult[]` format
     - Uploaded Video: Use `react-native-video-processing` to extract frames at configurable intervals (default 30fps)
  3. **Pose Detection Unification**: 
     - Apply MoveNet Lightning model to extracted frames for uploaded videos
     - Maintain consistent `PoseDetectionResult[]` format across both sources
     - Confidence filtering and temporal smoothing for uploaded video pose data
  4. **Video/Voice Analysis**: Gemini 2.5 processes video frames, pose data, and audio for comprehensive feedback
  5. **Metrics Aggregation**: Normalized 0–100 scales from pose keypoints and movement analysis; compose radar values
  6. **LLM Prompt**: Builds structured feedback with key takeaways and next steps using unified pose data
  7. **SSML Generation**: Gemini LLM creates structured speech markup per feedback item
  8. **TTS Generation**: Gemini 2.5 Flash Preview TTS converts SSML to audio via `_shared/gemini/tts.ts`; orchestrator in `ai-analyze-video/gemini-tts-audio.ts` handles mock/real mode routing; convert to AAC/MP3 format; store audio; save all artifacts/URLs to DB

* **Audio Playback Strategy**:
  - **Format Optimization**: Convert TTS output from WAV to AAC/MP3 for 75%+ file size reduction
  - **Cross-Platform Compatibility**: AAC primary (iOS/Android), MP3 fallback (universal), OGG for web
  - **Client Playback**: Use `react-native-video` for unified video/audio playback across platforms
  - **Audio-Only Fallback**: `react-native-sound` if needed for dedicated audio-only files
  - **Web Fallback**: HTML5 `<audio>` element with multiple format sources
  - **Performance**: Compressed formats reduce load times and memory consumption on mobile devices
  - **User Experience**: Require user interaction to initiate audio playback (autoplay restrictions)

* **Realtime & Polling**:
  - Realtime: Subscribe to Postgres changes on `public.analysis_jobs` (UPDATE, filter `id=eq.<id>`)
  - Live Pose (optional): Broadcast channel `pose-data-<id>` with event `pose-frame`
  - Polling fallback: `GET /ai-analyze-video/status?id=<id>` with exponential backoff (e.g., 1s → 2s → 4s up to 30s)

* **TTS Status**:
  - Full implementation: Gemini TTS generates per-feedback MP3/WAV audio stored in `processed` bucket
  - Audio URLs are signed and stored in `analysis_audio_segments.audio_url`

* **Error Handling**:
  - Use discriminated union results in client hooks
  - Edge: validate inputs with Zod, timeouts/retries for providers, structured error codes
  - User-safe messages; log correlation id; avoid leaking provider details

---

## Security Considerations
* **General Security**: See `core/monorepo-foundation.mdc` and `quality/security-best-practices.mdc`
* **Edge Function Secrets**: Service-role key used server-side only; never exposed to client
* **CORS**: Allow `authorization, x-client-info, apikey, content-type`; Methods: `GET, POST, PUT, DELETE, OPTIONS`
* **Health Endpoint Exposure**: `/ai-analyze-video/health` returns sanitized env booleans only

---

## Performance and Scalability
* **Load Handling**:
  - Async analysis jobs; realtime updates; queue long tasks with pg_cron/webhooks if needed
* **Caching Strategies**:
  - Cache LLM/TTS for identical SSML; CDN for `processed` artifacts (AAC/MP3 audio files)
* **Scaling**:
  - Horizontal scale Edge Functions; Storage/CDN scales automatically; DB indexes on `analyses.user_id`, `created_at`

---

## Environment Configuration ✅ **IMPLEMENTED**

* **Test Authentication Variables**:
  ```bash
  # Test Authentication (for development/testing only)
  TEST_AUTH_ENABLED=false          # Enable automatic authentication
  TEST_AUTH_EMAIL=test@example.com # Test user email
  TEST_AUTH_PASSWORD=test-password-123 # Test user password
  ```

* **Environment-Specific Configuration**:
  - **Development** (`env.dev.example`): `TEST_AUTH_ENABLED=true` for seamless development
  - **Production** (`env.prod.example`): `TEST_AUTH_ENABLED=false` with build-time guards
  - **Testing** (CI/E2E): `TEST_AUTH_ENABLED=true` for automated test flows

* **Security Considerations**:
  - Test auth disabled in production builds via `NODE_ENV` checks
  - Test credentials never committed to version control
  - Separate test users per environment to prevent conflicts
  - Test user seeding via `yarn seed:test-user` command

---

## Testing Strategy ✅ **COMPREHENSIVE AUTH TESTING IMPLEMENTED**
* **General Testing**: See `quality/testing-unified.mdc` for unit/integration testing patterns
* **Authentication Testing** ✅ **45+ Tests Implemented**:
  - **Unit Tests**: Auth client, useAuth hook, auth store, test bootstrap (25+ tests)
  - **Integration Tests**: Route protection, auth flows, RLS enforcement (15+ tests)  
  - **E2E Tests**: Playwright pre-authentication with global setup (5+ tests)
  - **Security Tests**: RLS compliance, user ownership validation, JWT extraction
* **Product-specific Testing**:
  - Performance: 60s sample videos across network profiles; measure end-to-end < 10s median
  - Security: RLS policy checks, signed URL TTL, auth path coverage, cross-user access prevention
  - UAT: Verify wireflow screens and interactions on iOS/Android and web with authenticated flows

---

## Deployment Plan
* **Environment Setup**:
  - See `core/development-operations.mdc` for local development setup
  - Staging/Prod: Supabase projects per environment; secrets in CI
* **Deployment Pipeline**:
  - See `core/development-operations.mdc` for build commands and CI patterns
  - Edge Functions CI: bundle and deploy via Supabase CLI
* **Rollout Strategy**:
  - Phased: internal test → beta → GA; feature flags for TTS
* **Rollback Plan**:
  - Previous function versions retained; DB migrations reversible; toggle flags to disable AI features

---

## Monitoring and Maintenance
* **Logging**: Structured logs in Edge (`supabase/functions/_shared/logger.ts`); request ids; client breadcrumbs for uploads
* **Monitoring Tools**: Supabase logs and metrics; optional Sentry for client/app
* **Alerting**: Error rate thresholds on Edge; slow job alerts > 15s
* **Maintenance Plan**: Weekly dependency updates; provider cost audits

---

## Risks and Mitigations
* **AI accuracy variance** → human-readable confidence + clear next steps
* **Mobile upload instability** → chunked/resumable uploads, backoff retries
* **Provider rate limits/costs** → queueing, caching, cost caps by user
* **Data privacy** → short-lived URLs, least-privilege buckets, PII scrubbing

---

## Dependencies
* **Internal**: `apps/expo`, `apps/next`, `packages/ui`, `packages/app`, `packages/api`
* **External**: 
  - **Core**: Expo, Tamagui, Supabase, TanStack Query, Zustand
  - **Native Pose**: react-native-fast-tflite, react-native-vision-camera, react-native-skia, react-native-worklets-core, react-native-video
  - **Video Processing**: react-native-video-processing (frame extraction and pose detection for uploaded videos)
  - **Audio Playback**: react-native-video (primary), react-native-sound (fallback for audio-only)
  - **Web Pose**: @tensorflow/tfjs, @tensorflow-models/pose-detection, @tensorflow/tfjs-backend-webgpu
  - **AI Services**: TTS provider (Gemini 2.0), LLM provider (Gemini 2.5)
  - **Models**: MoveNet Lightning (movenet_lightning_int8.tflite)

---

## Glossary
* **LLM**: Large Language Model for generating text feedback
* **SSML**: Speech Synthesis Markup Language
* **RLS**: Row Level Security

---

### Upload and Analysis Pipeline

**Upload Flow:**
- Client initiates upload with compression (for URIs) or direct upload (for picked files)
- Progress tracked via `useUploadProgressStore` with temporary task IDs
- On upload initialization, `videoRecordingId` is assigned and propagated to UI
- Backend automatically starts analysis when upload completes (no client trigger needed)

**Analysis Flow:**
- Backend triggers analysis job creation and processing upon upload completion
- Client subscribes to analysis job updates via realtime APIs
- UI transitions: Upload → Analysis → Results with seamless state management

**Error Handling:**
- Upload failures surfaced in `VideoAnalysisScreen` with retry/back options
- Analysis failures handled via realtime job status updates
- Network issues queue uploads for offline retry

**State Management:**
- Upload progress: `useUploadProgressStore` with selectors for active tasks (`getLatestActiveTask`, `getTaskByRecordingId`)
- Analysis progress: `subscribeToAnalysisJob` with realtime updates
- UI derives `videoRecordingId` from route props or latest active upload task
- RecordingId propagation: optional `onRecordingIdAvailable` callback for route param updates

## Appendix
* **References**:
  - Product PRD: ./SoloLevel-PRD.md
  - Wireflow: ./wireflow.png
* **Diagrams**: See Mermaid architecture above
* **Changelog**:
  - 0.1 (2025-08-26): Initial MVP technical design

