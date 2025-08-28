# Camera Recording Implementation Tasks

## Context & Analysis
- **Wireframe Images**: docs/specification/wireframes/P0/01a_camera.png, 01b_recording.png [Status: ✅]
- **Wireframe Analysis**: docs/features/camera-recording/analysis.md [Status: ✅]
- **User Stories**: docs/specification/user_stories/P0/01a_camera.md, 01b_recording.md [Status: ✅]
- **Feature Description**: Camera recording screen with idle/recording states, pose overlay, upload functionality
- **Platforms**: [Both] - Cross-platform mobile-first implementation
- **Priority**: High (P0 feature)
- **Total Effort**: L (Large - Complex camera integration with AI features)
- **Technical Requirements**: Documented and validated [✅]
- **Cross-Platform Considerations**: Mobile-first approach confirmed [✅]

## Completed Tasks
- [x] Complete systematic wireframe analysis using analysis template [Both]
- [x] Validate all 15 user stories coverage in analysis [Both]
- [x] Confirm TRD alignment (performance, security, architecture) [Both]
- [x] Validate mobile-first responsive design approach [Both]
- [x] Create comprehensive testing strategy documentation [Both]

### Phase 1: Mobile Foundation - COMPLETED ✅
- [x] Create camera permissions management hook [Both] [M]
  - Handle camera/microphone permission requests (US-RU-02)
  - Implement permission rationale modal with settings redirect
  - Add permission status tracking in state
- [x] Setup core TypeScript interfaces and Zod schemas [Both] [S]
  - CameraRecordingScreenProps interface
  - PoseOverlayProps interface  
  - RecordingControlsProps interface
  - Recording state enums and validation schemas
- [x] Build responsive camera container layout [Both] [M]
  - YStack root container with safe area handling
  - Responsive header with 44px touch targets
  - Camera preview area with relative positioning
  - Mobile-first breakpoint implementation ($xs, $sm, $md)
- [x] Create camera header component [Both] [S]
  - Navigation/menu button (hamburger icon)
  - Dynamic title/timer display
  - Notification button with badge overlay
- [x] Implement camera preview container [Both] [M]
  - Platform-specific camera component integration
  - Safe area and orientation handling
  - Preview scaling and aspect ratio management
- [x] Setup bottom navigation component [Both] [S]
  - Three-tab layout (Coach/Record/Insights) 
  - Active state management for Record tab
  - Responsive tab sizing and touch targets

### Phase 2: Interactive Elements - COMPLETED ✅
- [x] Implement recording state machine [Both] [M]
  - State transitions: idle → recording → paused → stopped (US-RU-01)
  - 60-second timer with hard limit enforcement
  - Recording status tracking and persistence
- [x] Build idle state camera controls [Both] [M]
  - Primary record button (80x80px, prominent styling) (US-RU-06a)
  - Upload button for video file selection (US-RU-03) 
  - Camera swap button (front/back toggle) (US-RU-09a)
  - Touch feedback and button press animations
- [x] Build recording state camera controls [Both] [M]
  - Pause/Stop button with visual feedback (US-RU-06b)
  - Recording timer display with monospace font
  - Camera settings button and modal sheet (US-RU-09b)
  - Zoom level controls (1x, 2x, 3x discrete levels) (US-RU-09b)
- [x] Add camera swap functionality [Both] [M]
  - Toggle between front/back cameras (US-RU-09a)
  - Disable during recording state (US-RU-09b)
  - Smooth transition animation
- [x] Implement zoom controls [Both] [S]
  - Discrete zoom levels (1x, 2x, 3x) (US-RU-09b)
  - Visual feedback for active zoom level
  - Smooth zoom transitions during recording
- [x] Create navigation confirmation dialog [Both] [S]
  - Warning modal for navigation during recording (US-RU-07)
  - "Discard" and "Cancel" options
  - Prevent accidental recording loss


## In Progress Tasks
None - Phase 2 complete, ready for Phase 3

## Future Tasks

### Phase 1: Mobile Foundation [Both] - ✅ COMPLETED
All Phase 1 tasks have been implemented and moved to Completed Tasks section above.

### Phase 2: Interactive Elements [Both] - ✅ COMPLETED
All Phase 2 tasks have been implemented and moved to Completed Tasks section above.

### Phase 3: Data Integration [Both]
- [ ] Create Supabase storage integration [Both] [L]
  - Signed URL generation for secure uploads (US-RU-05)
  - Upload to `raw` bucket with proper file naming
  - Short-lived URL expiration (5min TTL)
- [ ] Implement background upload service [Both] [M]
  - Progress tracking with 500ms update intervals (US-RU-04)
  - Network retry logic with exponential backoff
  - Upload cancellation functionality
  - Progress persistence across app backgrounding
- [ ] Build video file selection [Native] [M]
  - Native file picker integration (US-RU-03)
  - MP4/MOV format validation
  - 60-second duration limit enforcement
  - File size validation and compression if needed
- [ ] Build video file selection [Web] [M]
  - Web file input with drag-and-drop support (US-RU-03)
  - Format and duration validation
  - Upload progress visualization
- [ ] Create analysis job creation [Both] [M]
  - TanStack Query hooks for analysis initiation
  - Job status tracking and real-time updates
  - Error handling and retry mechanisms
- [ ] Setup real-time analysis updates [Both] [M]
  - Supabase real-time subscription for analysis progress
  - Status updates: queued → processing → completed → failed
  - Progress percentage tracking

### Phase 4: Screen Integration [Both]
- [ ] Create camera recording screen component [Both] [L]
  - Integrate all camera controls and states
  - State management with recording flow
  - Error boundary for camera failures
  - Memory management and cleanup
- [ ] Implement pose detection overlay [Both] [L]
  - Live motion capture with skeleton nodes (US-RU-08)
  - SVG/Canvas overlay rendering at 30fps
  - Non-blocking interaction with controls
  - Confidence threshold filtering for pose data
- [ ] Add side sheet navigation [Both] [M]
  - Drawer component with video history (US-RU-12)
  - Previous videos with thumbnails
  - Coach conversation history
  - Navigation to detail views
- [ ] Create post-recording playback [Both] [M]
  - Video playback with controls overlay (US-RU-13)
  - Live analysis progress display
  - Processing status updates
  - Error handling and retry options
- [ ] Add Expo Router navigation [Native] [S]
  - Route in apps/expo/app/record.tsx
  - Tab navigation integration
  - Deep linking support
- [ ] Add Next.js page routing [Web] [S]
  - Route in apps/next/pages/record.tsx
  - Server-side rendering optimization
  - SEO considerations for web

### Phase 5: Platform Optimization [Both]
- [ ] Optimize camera performance [Both] [M]
  - Camera initialization under 2 seconds
  - Recording start latency under 500ms
  - Memory usage optimization during extended recording
  - Battery usage monitoring and optimization
- [ ] Implement platform-specific gestures [Native] [M]
  - Pan gestures for camera movement
  - Pinch-to-zoom as alternative to discrete buttons
  - Haptic feedback for record start/stop
  - Platform-specific animation curves
- [ ] Add web-specific enhancements [Web] [S]
  - Keyboard shortcuts for camera controls
  - Mouse hover states and interactions
  - Web-specific error handling (getUserMedia failures)
- [ ] Optimize bundle size [Both] [M]
  - Lazy load pose detection models
  - Code splitting for camera components
  - Tree-shaking optimization
  - Asset optimization and compression
- [ ] Add accessibility features [Both] [L]
  - Screen reader support for camera states
  - Voice control integration
  - High contrast mode compatibility
  - Keyboard navigation for web platform

### Phase 6: Quality Assurance [Both]
- [ ] Implement comprehensive error handling [Both] [M]
  - Camera permission failures
  - Recording failures and recovery
  - Upload failures with retry logic
  - Network connectivity issues
- [ ] Add loading states and feedback [Both] [S]
  - Camera initialization loading
  - Recording status indicators
  - Upload progress indicators
  - Analysis processing status
- [ ] Performance monitoring [Both] [M]
  - Camera startup time tracking
  - Memory usage monitoring
  - Upload success rate tracking
  - Analysis completion time tracking
- [ ] Security validation [Both] [M]
  - Row Level Security policy testing
  - Signed URL expiration validation
  - Video metadata scrubbing verification
  - Auth token validation on uploads

## Testing Pipeline

### Unit Testing [Both]
- [ ] Camera permission hook tests [Both] [S]
  - Permission status management
  - Modal display logic
  - Settings navigation
- [ ] Recording state machine tests [Both] [M]
  - State transition validation
  - Timer accuracy and limits
  - Pause/resume functionality
- [ ] Upload service tests [Both] [M]
  - Progress tracking accuracy
  - Retry logic validation
  - Cancellation handling
- [ ] Pose overlay component tests [Both] [S]
  - Coordinate mapping accuracy
  - Rendering performance
  - Confidence threshold filtering

### Integration Testing [Both]
- [ ] Camera initialization flow [Both] [M]
  - Permission request → camera ready
  - Error states and recovery
  - Platform-specific camera API integration
- [ ] Complete recording workflow [Both] [L]
  - Record → Pause → Resume → Stop flow
  - State persistence across app backgrounding
  - Memory cleanup verification
- [ ] Upload and analysis flow [Both] [L]
  - Video selection → upload → analysis initiation
  - Progress tracking end-to-end
  - Real-time status updates
- [ ] Navigation and state management [Both] [M]
  - Tab navigation during recording
  - Confirmation dialogs
  - Side sheet interactions

### End-to-End Testing [Both]
- [ ] Native E2E testing [Native] [L]
  - Complete user journey: idle → record → upload → analyze
  - Permission handling on fresh install
  - Background/foreground state handling
  - Device-specific camera testing (iOS/Android)
- [ ] Web E2E testing [Web] [L]
  - Browser compatibility (Chrome, Safari, Firefox)
  - File upload via drag-and-drop
  - Camera access in different browsers
  - Responsive behavior across screen sizes
- [ ] Cross-platform parity testing [Both] [M]
  - Visual consistency between platforms
  - Feature parity validation
  - Performance benchmarking
  - Upload reliability on various networks

### Performance Testing [Both]
- [ ] Camera performance benchmarks [Both] [M]
  - Initialization time < 2s
  - Recording start latency < 500ms
  - Pose overlay at 30fps without frame drops
  - Memory usage during extended recording
- [ ] Upload performance testing [Both] [M]
  - Success rate p95 ≥ 99% on 3G+ networks
  - Progress updates every 500ms
  - Large file handling (60s videos)
  - Network interruption recovery
- [ ] Analysis pipeline testing [Both] [S]
  - End-to-end processing time < 10s
  - Real-time status update latency
  - Error recovery and retry mechanisms

### Accessibility Testing [Both]
- [ ] Screen reader testing [Both] [M]
  - Camera state announcements
  - Recording status updates
  - Control labeling and navigation
- [ ] Touch target validation [Both] [S]
  - All buttons ≥ 44px × 44px
  - Sufficient spacing between controls
  - One-handed usage patterns
- [ ] High contrast and visual testing [Both] [S]
  - Control visibility over camera preview
  - Color contrast ratios
  - Text readability in all states

## Mobile-Specific Considerations

### Responsive Design [Both]
- [ ] Mobile-first breakpoint implementation [Both] [S]
  - xs (0-428px): Default wireframe layout
  - sm (429-768px): Slightly larger controls
  - md (769px+): Optional side-by-side layouts
- [ ] Safe area handling [Both] [S]
  - useSafeAreaInsets() integration
  - Notch and home indicator accommodation
  - Orientation change handling
- [ ] Touch optimization [Both] [S]
  - 44px minimum touch targets verified
  - Thumb-friendly control positioning
  - Gesture conflict resolution

### Native Platform Features [Native]
- [ ] Platform-specific camera integration [Native] [M]
  - expo-camera integration
  - Native video recording optimization
  - Platform-specific error handling
- [ ] Background processing [Native] [M]
  - Upload continuation in background
  - Recording state preservation
  - Memory management during backgrounding
- [ ] Platform animations [Native] [S]
  - Native transition animations
  - Haptic feedback integration
  - Platform-appropriate loading indicators

### Performance Optimizations [Both]
- [ ] Memory management [Both] [M]
  - Camera resource cleanup on unmount
  - Video file cleanup after upload
  - Pose detection model memory optimization
- [ ] Network optimization [Both] [S]
  - Upload chunk size optimization
  - Progress tracking efficiency
  - Retry logic with exponential backoff
- [ ] Rendering optimization [Both] [S]
  - Pose overlay rendering efficiency
  - Camera preview scaling optimization
  - UI component memoization

## Acceptance Criteria
- [ ] All 15 user stories (US-RU-01 through US-RU-13) fully implemented [Both]
- [ ] Screen matches wireframes pixel-perfectly on mobile devices [Both]
- [ ] Recording workflow: idle → record → pause/resume → stop → upload [Both]
- [ ] Upload success rate p95 ≥ 99% on 3G+ networks for 60s videos [Both]
- [ ] Camera initialization < 2s, recording start < 500ms [Both]
- [ ] Pose overlay renders at 30fps without blocking camera controls [Both]
- [ ] All touch targets meet 44px minimum size requirement [Both]
- [ ] Cross-platform visual and functional parity maintained [Both]
- [ ] WCAG 2.2 AA accessibility compliance [Both]
- [ ] Security requirements: RLS, signed URLs, PII protection [Both]

## Quality Gates
- [ ] TypeScript compilation with zero errors [Both]
- [ ] All unit tests passing (>90% coverage) [Both]
- [ ] Integration tests covering all user workflows [Both]
- [ ] E2E tests passing on actual devices [Both]
- [ ] Performance benchmarks met in CI pipeline [Both]
- [ ] Accessibility audit passing [Both]
- [ ] Security penetration testing passed [Both]
- [ ] Code review approval from platform leads [Both]

## Relevant Files
- `docs/features/camera-recording/analysis.md` — Wireframe analysis reference [x]
- `docs/features/camera-recording/tasks.md` — This task list [x]
- `docs/features/camera-recording/validation-report.md` — Analysis validation [x]
- `docs/specification/user_stories/P0/01a_camera.md` — Idle state user stories [x]
- `docs/specification/user_stories/P0/01b_recording.md` — Recording state user stories [x]
- `packages/ui/components/CameraRecording/` — UI component directory [ ]
- `packages/app/features/CameraRecording/` — Screen logic directory [ ]
- `packages/api/hooks/useCameraRecording.ts` — Camera data hooks [ ]
- `packages/api/hooks/useVideoUpload.ts` — Upload service hooks [ ]
- `apps/expo/app/record.tsx` — Native route [ ]
- `apps/next/pages/record.tsx` — Web route [ ]
- `supabase/migrations/xxx_camera_recording_tables.sql` — Database schema [ ]

## Cross-Platform Validation Checklist
- [ ] Visual parity: UI renders identically on iOS, Android, and web [Both]
- [ ] Interaction parity: All gestures and controls work consistently [Both]
- [ ] Performance parity: Similar load times and responsiveness [Both]
- [ ] Feature parity: All functionality available on both platforms [Both]
- [ ] Accessibility parity: Screen readers work on all platforms [Both]
- [ ] Navigation integration: Seamless tab and deep link handling [Both]

## Implementation Notes
- **Analysis Reference**: Always validate implementation against docs/features/camera-recording/analysis.md
- **Mobile-First Approach**: Design for iPhone SE (375px), expand to larger screens
- **Device Testing**: Test on actual iOS and Android devices, not just simulators
- **Performance Priority**: Camera responsiveness is critical for user experience
- **Security Focus**: Follow TRD security requirements for video uploads and storage
- **Platform Conventions**: Respect iOS and Android platform-specific UX patterns
- **Memory Management**: Essential for camera-heavy application performance

## Analysis Integration
- **User Story Validation**: All 15 user stories (US-RU-01 through US-RU-13) mapped to implementation tasks
- **Technical Requirements**: TRD performance targets (< 10s analysis, < 3s launch, 99% upload success)
- **Component Architecture**: Implementation follows analysis component hierarchy and TypeScript interfaces
- **Testing Strategy**: Comprehensive testing pipeline covers all analysis requirements (unit, integration, E2E, performance, security, accessibility)
- **Mobile-First Design**: Responsive breakpoints and touch targets as specified in analysis
- **Cross-Platform Considerations**: Platform-specific implementations align with analysis technical requirements
