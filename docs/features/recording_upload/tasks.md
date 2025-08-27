# 01_recording_upload — Implementation Tasks

## Context & Analysis

- **Wireframe Image**: docs/specification/wireframes/P0/01_recording_upload.png [Status: ✅]
- **Wireframe Analysis**: docs/features/recording_upload/analysis.md [Status: ✅]
- **Feature Description**: Record or upload ≤60s videos, background upload to Supabase Storage with progress/retry, trigger AI analysis via Edge Function, realtime status updates, and handoff to analysis screen.
- **Platforms**: [Both]
- **Priority**: High (P0)
- **Total Effort**: [L]
- **Technical Requirements**: Documented and validated [✅]
- **Cross-Platform Considerations**: Mobile-first approach confirmed [✅]

## Completed Tasks
- [x] Complete systematic wireframe analysis using docs/templates/analysis-template.md [Both]
- [x] Save analysis as docs/features/recording_upload/analysis.md [Both]
- [x] Validate technical requirements and cross-platform considerations [Both]
- [x] Create comprehensive task breakdown with analysis reference [Both]

## In Progress Tasks

## Future Tasks

### Phase 1: Mobile Foundation [Both]
- [ ] Create feature skeleton in `packages/app/features/recording-upload/` and `packages/ui/src/recording/` [Both] [S]
- [ ] Implement `RecordScreen` base layout (safe area, YStack/ZStack) [Both] [M]
- [ ] Add `TopBar` with centered title and notifications badge [Both] [S]
- [ ] Implement `BottomTabs` with Coach/Record/Insights (Record selected) [Both] [S]
- [ ] Implement `CameraPreview.native` using `expo-camera` [Native] [M]
- [ ] Implement `CameraPreview.web` with file picker + `<video>` preview fallback [Web] [M]
- [ ] Implement `RecordingTimer` with 60s hard cap [Both] [S]
- [ ] Add subtle gradient HUD behind timer for readability [Both] [S]
- [ ] Scaffold `MotionOverlay` (non-blocking overlay) [Native] [M]
- [ ] Stub `MotionOverlay` fallback for web [Web] [S]
- [ ] Permission rationale modal (camera/mic) [Native] [S]

### Phase 2: Interactive Elements [Both]
- [ ] Controls: Record/Pause/Resume/Stop with state transitions [Native] [M]
- [ ] Upload existing video (duration/format validation MP4/MOV, ≤60s) [Both] [M]
- [ ] Zoom segmented control (1x/2x/3x) [Native] [S]
- [ ] Camera Swap (front/back) [Native] [S]
- [ ] Settings sheet (flash/grid toggles per TRD) [Native] [S]
- [ ] Library side sheet with previous videos and coach conversations [Both] [M]
- [ ] Edge-swipe gesture to open side sheet (gesture-handler) [Native] [S]
- [ ] Tap-to-focus on camera preview (if supported) [Native] [M]
- [ ] Confirm navigation away while recording (discard dialog) [Native] [S]
- [ ] Enforce 44×44 touch targets across controls [Both] [S]
- [ ] Show last uploaded video thumbnail on Upload button [Both] [S]
- [ ] Disable Camera Swap while recording [Native] [S]

### Phase 3: Data Integration [Both]
- [ ] Create `mediaStore` (permissions, recordingState, cameraFacing, zoomLevel, recordedVideoUri, lastThumbnail) [Both] [M]
- [ ] Create `analysisStore` (currentUpload, currentAnalysis) [Both] [M]
- [ ] TanStack Query: `useSignedUploadUrl(videoMeta)` [Both] [M]
- [ ] TanStack Query: `useAnalyzeVideo(videoPath)` [Both] [M]
- [ ] TanStack Query/Realtime: `useAnalysisRealtime(analysisId)` [Both] [M]
- [ ] Supabase Storage upload with progress, retry backoff, resume on reconnect [Both] [L]
- [ ] Invoke Edge Function `ai-analyze-video` and handle response [Both] [M]
- [ ] Zod schemas for payloads/responses and validations [Both] [S]
- [ ] Secure upload to `raw` bucket via short-lived signed URL [Both] [M]
- [ ] Fetch previous videos (thumbnails via signed URLs) and coach conversations [Both] [M]

### Phase 4: Screen Integration [Both]
- [ ] Wire flow: Stop → queue upload → start analysis → navigate to analysis/progress screen [Both] [M]
- [ ] Add Expo Router route `/(tabs)/record` and link bottom tabs [Native] [S]
- [ ] Add Next.js page `/record` (client-only) [Web] [S]
- [ ] Implement deep link to video detail from side sheet [Both] [S]
- [ ] Implement notifications list route and badge count [Both] [S]

### Phase 5: Platform Optimization [Both]
- [ ] Memoize overlay nodes; avoid re-renders in preview [Both] [M]
- [ ] Accessibility: RN roles/labels; ARIA on web; contrast checks [Both] [M]
- [ ] Add haptics feedback on record/pause/stop [Native] [S]
- [ ] Responsive adjustments at sm/md breakpoints (tablet/desktop) [Both] [S]
- [ ] Offline-aware upload (queue, resume) [Both] [M]
- [ ] Use FlashList for library list on native [Native] [S]
- [ ] Graceful web fallback for unsupported camera controls [Web] [S]

### Phase 6: Quality Assurance [Both]
- [ ] Unit tests for Zustand stores and utilities [Both] [M]
- [ ] Unit tests for Zod schemas (validation success/failure paths) [Both] [S]
- [ ] Integration tests: record→stop→upload→analyze happy path [Both] [M]
- [ ] Integration tests: permission-denied and retry-on-failure flows [Both] [M]
- [ ] Integration tests: realtime subscription updates for analysis status [Both] [M]
- [ ] E2E Native (Detox): basic recording/upload/analysis kickoff flow [Native][L]
- [ ] E2E Web (Playwright): upload/analysis kickoff/side sheet interactions [Web] [M]
- [ ] Visual regression for `ControlsBar`, `PermissionDialog`, `NotificationsBadge`, `LibrarySideSheet` [Both] [M]
- [ ] Accessibility audits (WCAG 2.2 AA, 44px targets) [Both] [M]
- [ ] Edge-swipe gesture opens side sheet (Detox) [Native] [S]
- [ ] Timer overlay visual regression with gradient HUD [Both] [S]

## Testing Pipeline

### Component & Unit Testing
- [ ] RN/Jest: `apps/expo/__tests__/recording-upload/*.test.tsx` [Native]
- [ ] Web/Vitest: `apps/next/__tests__/recording-upload/*.test.tsx` [Web]
- [ ] Shared logic/Vitest: `packages/app/features/recording-upload/__tests__/*.test.ts` [Both]
- [ ] UI components/Vitest: `packages/ui/src/recording/__tests__/*.test.tsx` [Both]
- [ ] Web/MSW setup: handlers for signed URL, analyze-video, analysis-status [Web]

### Integration Testing
- [ ] Screen tests (RN/Jest): `packages/app/features/recording-upload/__tests__/RecordScreen.native.test.tsx` [Native]
- [ ] Screen tests (Web/Vitest + RTL): `packages/app/features/recording-upload/__tests__/RecordScreen.web.test.tsx` [Web]
- [ ] Data layer tests: `packages/api/src/__tests__/recording-upload.hooks.test.ts` [Both]
- [ ] Navigation flow tests across tabs/routes [Both]
- [ ] Mock Supabase Realtime events and verify UI updates [Both]

### End-to-End Testing
- [ ] Native/Detox: `e2e/native/recording-upload.spec.ts` [Native]
- [ ] Web/Playwright: `tests/playwright/recording-upload.spec.ts` [Web]
- [ ] Cross-platform flow validation against acceptance criteria [Both]
- [ ] Add stable testIDs for all primary controls (record, pause, stop, upload, swap, zoom) [Both]

### Performance & Accessibility
- [ ] Measure preview FPS and upload p95 success (3G+) [Both]
- [ ] Bundle size analysis (web) and startup time (native/web) [Both]
- [ ] Memory profiling during preview/recording [Both]
- [ ] Accessibility audit (labels, roles, contrast, touch targets) [Both]
- [ ] Measure end-to-end analysis latency (< 10s median) [Both]

## Relevant Files
- `docs/features/recording_upload/analysis.md` — Wireframe analysis reference [x]
- `docs/features/recording_upload/tasks.md` — This task list [x]
- `docs/features/recording_upload/components/` — Component documentation [ ]
- `docs/features/recording_upload/testing/` — Testing documentation [ ]
- `packages/app/features/recording-upload/` — Feature logic and stores [ ]
- `packages/ui/src/recording/` — Reusable UI components [ ]
- `packages/api/src/hooks/recording-upload.ts` — Data hooks [ ]
- `supabase/migrations/xxxx_recording_upload.sql` — DB schema/policies if needed [ ]

## Cross-Platform Validation Checklist
- [ ] Visual parity between web and native
- [ ] Interaction behavior consistency (gestures vs clicks)
- [ ] Performance parity (launch, analysis time, responsiveness)
- [ ] Accessibility feature parity (labels, navigation)
- [ ] Navigation integration works on both platforms

## Implementation Notes
- **Analysis Reference**: Validate all tasks against `docs/features/recording_upload/analysis.md`.
- **Mobile-First Approach**: Design for smallest screens first; scale up with breakpoints.
- **Device Testing**: Verify on physical iOS/Android devices and multiple browsers.
- **Offline Considerations**: Ensure upload queues and resumability on flaky networks.
- **One-Handed Usage**: Prioritize bottom controls, 44px touch targets.
- **Security**: Use short-lived signed URLs; enforce RLS; no PII in logs.

## Analysis Integration
- Reference component mapping and state/api plans from analysis
- Validate TRD-aligned data flow and performance targets during implementation
- Update analysis if requirements change; use it as acceptance criteria source of truth
