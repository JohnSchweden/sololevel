# 01_recording_upload — Wireframe Analysis

References:
- PRD: `docs/specification/1_PRD.md`
- TRD: `docs/specification/2_TRD.md`
- User Stories: `docs/specification/user_stories/P0/01_recording_upload.md`
- Wireframe: `docs/specification/wireframes/P0/01_recording_upload.png`

## Visual Analysis Phase
- [x] **Layout Structure**
  - Root: `YStack` with safe-area padding; background `$background`.
  - Header (top bar): `XStack` height ~60 with optional back, centered title “Record”, right-aligned notifications bell with badge.
  - Main content: `ZStack` full-bleed camera preview (fills available height) with overlay layers:
    - Layer 1: Camera preview surface
    - Layer 2: Live motion overlay nodes (non-interactive)
    - Layer 3: Minimal HUD: timer at top, subtle gradient for readability
  - Controls bar (bottom over preview): `XStack` with large primary Record/Resume/Stop, Upload, Camera Swap, Zoom segmented (1x/2x/3x), Settings, and last-video thumbnail. Respect safe area.
  - Bottom navigation: `XStack` with three tabs: Coach, Record (selected), Insights.
  - Side sheet (library/coach): right-side `Sheet`/`Drawer` overlay listing previous videos (thumbnails) and coach conversations; opens via menu button or edge-swipe.
  - Permission modal: centered modal with rationale + “Go to Settings”.

- [x] **Component Mapping** (Tamagui)
  - Containers: `YStack`, `XStack`, `ZStack`, `ScrollView` (only for side sheet lists)
  - Media: camera preview surface (native: Expo Camera view; web: file picker preview `<video>`)
  - Buttons: `Button` with minHeight/minWidth 44; variants: primary (Record), outlined (Stop/Upload), ghost (Camera Swap/Settings)
  - Segmented zoom: `XStack` of `Button` group with selected state
  - Badge: `YStack` absolute positioned on bell icon
  - Sheet/Drawer: Tamagui `Sheet` with snap points (e.g., 80%, 100%)
  - Modals: Tamagui `Dialog`
  - Lists: `FlashList` on native, regular list on web

- [x] **Responsive Breakpoints** (mobile-first)
  - Mobile (xs ≤ 428px): full-bleed camera, bottom controls compact; bottom tabs visible
  - Tablet (sm 429–768px): increase control spacing; side sheet can dock; two-column side sheet
  - Desktop (md+ ≥ 769px): optional left side navigation; larger preview; hover states enabled

- [x] **Interactive Elements**
  - Primary: Record (toggle to Stop), Pause/Resume, Upload existing, Camera Swap, Zoom (1x/2x/3x), Settings, Notifications, Open side sheet
  - Gestures: edge-swipe to open side sheet; tap to focus (if supported), pinch-to-zoom (optional later)
  - Touch targets: all actionable controls ≥ 44×44

- [x] **Content Types**
  - Text: title, timer, statuses; icons: record, pause, stop, upload, swap, gear, bell
  - Media: camera preview, video thumbnails
  - Overlay: motion capture nodes/lines

- [x] **Navigation Patterns** (Expo Router)
  - Tabs: `/(tabs)/coach`, `/(tabs)/record`, `/(tabs)/insights`
  - Modals: `/(modals)/permissions`
  - Sheets: `/(sheets)/library` or component-level `Sheet`
  - Deep link to video detail from side sheet

## Technical Requirements Phase (Cross‑ref TRD)
- [x] **Data Requirements**
  - Upload to Supabase Storage bucket `raw` via short‑lived signed URL → returns storage path
  - Invoke Edge Function `ai-analyze-video` with `{ videoPath }` → returns `analysisId`
  - Subscribe to `analyses` row via Realtime for status/progress (queued/processing/completed/failed)
  - Persist artifacts in DB (`analyses`, `analysis_metrics`) and Storage (`processed`)

- [x] **State Management**
  - Zustand stores:
    - `mediaStore`: permissions (camera/mic), `recordingState` ('idle'|'recording'|'paused'), `recordedVideoUri`, `cameraFacing`, `zoomLevel`, `lastThumbnail`, confirmation flags
    - `analysisStore`: `currentUpload` { id, progress, status, error }, `currentAnalysis` { id, status, progress }
  - TanStack Query:
    - `useSignedUploadUrl(videoMeta)`
    - `useAnalyzeVideo(videoPath)`
    - `useAnalysisRealtime(analysisId)`
  - Validation: Zod for request payloads and response data

- [x] **Platform Considerations**
  - Native: `expo-camera`, `expo-video`, `react-native-reanimated` for overlay; background upload via `@supabase/storage-js` with progress; permissions via `expo-permissions`
  - Web: file input for upload, preview `<video>`; camera capture optional (progressive enhancement)
  - Disable unsupported controls gracefully on web

- [x] **Performance Needs**
  - Analysis < 10s median; app launch < 3s (PRD/TRD)
  - Smooth preview and overlay at 30–60 fps; memoize overlay nodes; avoid re‑renders
  - Upload: progress feedback; retry with backoff; resume when connectivity returns

- [x] **Accessibility**
  - Labels/roles on controls; focus order logical; high‑contrast tokens; large targets; haptics minimal

## Business Requirements Validation (Cross‑ref PRD)
- Priority: P0 “Video Upload/Recording” feature directly supported
- Success metrics alignment: feedback generation time, DAU, retention; UI favors quick submission and clarity
- Persona fit: time‑constrained users; minimal steps to record/upload; clear progress and outcomes
- Timeline: MVP‑feasible scope; advanced gestures (pinch‑zoom) optional

## User Story Compliance (Cross‑ref User Stories)
- US‑RU‑01 Record up to 60s: timer + hard cap; Stop saves locally
- US‑RU‑02 Permissions: rationale modal + disabled controls until granted
- US‑RU‑03 Upload MP4/MOV ≤ 60s: validate duration/format before queue
- US‑RU‑04 Background upload with progress/retry/resume/cancel
- US‑RU‑05 Secure upload to `raw` via signed URL; return storage path
- US‑RU‑06 Recording states: Idle/Recording/Paused UI controls; Back prompts discard
- US‑RU‑07 Confirm navigation away during recording
- US‑RU‑08 Live motion overlay visible, non‑blocking
- US‑RU‑09 Camera controls: swap, zoom presets, settings sheet
- US‑RU‑10 Bottom navigation tabs (Coach/Record/Insights)
- US‑RU‑11 Notifications bell with badge opens notifications list
- US‑RU‑12 Side sheet with previous videos and coach conversations; navigate to detail
- US‑RU‑13 Post‑record playback with background analysis kickoff (handoff to analysis flow)

## Component Architecture Phase
- [x] **Component Hierarchy**
  - `RecordScreen`
    - `TopBar` (Back, Title, NotificationsBadge)
    - `CameraPreview` (platform abstraction)
      - `MotionOverlay`
      - `RecordingTimer`
    - `ControlsBar` (Record/Pause/Stop, Upload, Swap, ZoomSegmented, Settings, Thumbnail)
    - `BottomTabs`
    - `PermissionDialog`
    - `LibrarySideSheet` (PreviousVideosList, CoachConversationsList)

- [x] **Props Interface (high‑level)**
  - `CameraPreview`: `facing`, `zoomLevel`, `onReady`, `onFrame?`, `onError`
  - `ControlsBar`: callbacks `onRecord`, `onPause`, `onStop`, `onUpload`, `onSwap`, `onZoomChange`
  - `MotionOverlay`: `keypoints`, `visible`
  - `PermissionDialog`: `missing`, `onOpenSettings`
  - `LibrarySideSheet`: `videos`, `conversations`, `onSelectVideo`, `onOpenConversation`

- [x] **Styling Strategy**
  - Tamagui theme tokens for color/space/typography; dark mode support; `minHeight`/`minWidth` 44 for touch
  - Subtle animations (press/hover, quick enter for dialogs/sheets)

- [x] **Testing Strategy**
  - Unit: stores (state transitions, selectors), validators (Zod), utility functions
  - Integration: record→stop→upload→analyze happy path; permission‑denied flow; retry on upload failure
  - E2E (Playwright): tab nav, open record, mock upload (MSW), status messages, side sheet interactions

## Cross‑Platform Validation Phase
- [x] **Web Implementation**: Next.js page with client‑only camera/upload; no SSR for camera; keyboard navigation; hover states
- [x] **Native Implementation**: Expo Router screen with camera permissions, reanimated overlay, haptics on record
- [x] **Shared Logic**: place business logic and stores in `packages/app/features/recording-upload`; presentational components in `packages/ui`
- [x] **Performance Testing**: measure render fps during preview; upload p95 success ≥ 99% on 3G+ for 60s clips; analysis E2E < 10s median

## Quality Gates
- [x] **Visual Parity**: identical layout/spacing across web/native within platform norms
- [x] **Interaction Parity**: gestures and clicks equivalent; confirmations consistent
- [x] **Accessibility Compliance**: WCAG 2.2 AA (web) + RN a11y roles/labels (native)
- [x] **Performance Benchmarks**: launch < 3s; smooth preview; responsive controls; analysis < 10s median

## Documentation Requirements
- [x] **Storybook Stories**: states for `ControlsBar`, `PermissionDialog`, `NotificationsBadge`, `LibrarySideSheet`
- [x] **API Documentation**: `ai-analyze-video` request/response; signed upload URL usage; Realtime subscription contract
- [x] **Testing Coverage**: unit/integration/E2E scenarios outlined above
- [x] **Accessibility Notes**: touch target audits, screen-reader labels, contrast checks

## Open Questions / Clarifications
1) Confirm exact icons/labels for bottom tabs and controls (names, icons set)
2) Should side sheet be modal on small phones or allow full‑screen snap? Preference?
3) Zoom: fixed 1×/2×/3× or continuous slider? (wireframe suggests presets)
4) Do we display last upload thumbnail on Upload button, or a separate recent‑thumb control?

