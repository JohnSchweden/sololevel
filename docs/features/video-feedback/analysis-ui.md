# Video Analysis & Feedback System - Complete UI/UX Analysis

> **Instructions**: This analysis consolidates all 5 wireframes (02a-02e) into a unified Video Analysis & Feedback System screen. It covers video processing, playback with motion capture, interactive controls, and feedback panel integration. Cross-reference with `analysis-feature.md` for business logic and `analysis-backend.md` for data requirements.

## Wireframe Integration Overview

This screen encompasses five distinct states/interactions with video processing support:
1. **02a_video_processing.png**: Initial video processing with AI analysis (supports both live recording and uploaded video)
2. **02b_video_playback.png**: Video playback with motion capture overlay and AI feedback bubbles
3. **02c_video_ontap_played.png**: Video controls overlay in playing state
4. **02d_video_ontap_paused.png**: Video controls overlay in paused state  
5. **02e_video_bottom_sheet.png**: Expanded feedback panel with timeline and social features

## Test-Driven UI Component Analysis Phase
- [x] **Visual Component Test Scenarios**: Define component rendering and styling tests with video processing
  - [x] Write snapshot tests for each component state (idle, loading, processing, error, success)
  - [x] Define video processing state tests (source detection, frame extraction, pose detection)
  - [x] Define responsive breakpoint tests (mobile, tablet, desktop)
  - [x] Test theme integration and token usage validation
  - [x] Document animation and transition test scenarios
- [x] **User Interaction Test Scenarios**: Define what users should be able to do with video processing
  - [x] Write test scenarios for each user interaction (tap, swipe, type, scroll)
  - [x] Define expected visual feedback for each interaction (hover, press, focus)
  - [x] Identify touch target size requirements (44px minimum)
  - [x] Document gesture handling tests (pan, pinch, long press)
  - [x] Test video processing progress interactions (cancel, retry, view details)
- [x] **Accessibility Test Scenarios**: Ensure inclusive design
  - [x] Screen reader navigation tests (semantic structure, ARIA labels)
  - [x] Keyboard navigation tests (tab order, focus management)
  - [x] Color contrast validation tests (WCAG 2.2 AA compliance)
  - [x] Dynamic type scaling tests (text size adjustments)

## Visual Design Analysis Phase
- [x] **Layout Structure**: Unified layout structure encompassing all 5 wireframe states
**Video Analysis & Feedback System Root Container**: Complete screen with state-based rendering
```typescript
// Unified Video Analysis & Feedback System Layout Structure
YStack fle ={1} backgroundColor="$background"
├── Header:  Stack height={60} paddingHorizontal="$4" alignItems="center" backgroundColor="$color2"
│   ├── BackButton: Button chromeless size={44} icon={ChevronLeft} color="$color12"
│   ├── TitleSection: YStack fle ={1} alignItems="center"
│   │   ├── MainTitle: Te t fontSize="$5" fontWeight="600" color="$color12" te tAlign="center"
│   │   └── Subtitle: Te t fontSize="$3" color="$color11" (conditional: "10 days ago")
│   └── MenuButton: Button chromeless size={44} icon={MoreVertical} color="$color12"
├── VideoArea: YStack fle ={1} position="relative" backgroundColor="$color1"
│   ├── ProcessingState: YStack (when status === 'processing')
│   │   ├── VideoThumbnail: YStack width="100%" aspectRatio={16/9} backgroundColor="$backgroundSubtle" borderRadius="$4"
│   │   ├── ProcessingOverlay: YStack position="absolute" inset={0} backgroundColor="rgba(0,0,0,0.6)" justifyContent="center" alignItems="center"
│   │   │   ├── ProcessingSpinner: Spinner size="large" color="$blue9"
│   │   ├── PipelineStageIndicator: YStack
│   │   │   ├── VideoSourceDetectionStage: Text "Detecting video source..." (Stage 1/6)
│   │   │   ├── FrameExtractionStage: Text "Extracting frames..." (Stage 2/6) - conditional for uploaded videos
│   │   │   ├── PoseDetectionStage: Text "Analyzing movement..." (Stage 3/6)
│   │   │   ├── PoseUnificationStage: Text "Unifying pose data..." (Stage 4/6)
│   │   │   ├── VideoAnalysisStage: Text "Processing video/voice..." (Stage 5/6)
│   │   │   ├── LLMFeedbackStage: Text "Generating feedback..." (Stage 6/6)
│   │   │   └── TTSGenerationStage: Text "Creating audio..." (Stage 7/6)
│   │   │   └── ProgressBar: Progress with stage-specific progress width="80%" height={4} backgroundColor="$backgroundSubtle"
│   │   └── AnalysisStatus: YStack gap="$3" marginTop="$6"
│   │       ├── StatusTitle: Te t fontSize="$5" fontWeight="600" te tAlign="center"
│   │       ├── StatusDescription: Te t fontSize="$4" color="$color11" te tAlign="center"
│   │       └── EstimatedTime: Te t fontSize="$3" color="$color10" te tAlign="center"
│   ├── PlaybackState: YStack (when status === 'ready' || 'playing')
│   │   ├── VideoPlayer: Platform-specific video component (full background)
│   │   │   ├── Native: react-native-video
│   │   │   └── Web: HTML5 <video> element
│   │   ├── MotionCaptureOverlay: YStack position="absolute" inset={0} pointerEvents="none"
│   │   │   ├── SkeletonNodes: Array of Circle components (white, 8p  radius)
│   │   │   └── SkeletonConnections: Array of Line components (gray, 2p  width)
│   │   ├── FeedbackBubbles: YStack position="absolute" bottom={100} right={20} gap="$3"
│   │   │   ├── SmallBubble: YStack backgroundColor="$color3" padding="$3" borderRadius="$3" ma Width={120}
│   │   │   │   └── Te t: "Nice grip!" fontSize="$4" color="$color12"
│   │   │   └── LargeBubble: YStack backgroundColor="$color3" padding="$4" borderRadius="$3" ma Width={200}
│   │   │       └── Te t: "Bend you knees a little bit and keep your back straight!" fontSize="$4" color="$color12"
│   │   ├── AudioFeedbackOverlay: YStack position="absolute" bottom={100} left="$4" right="$4" (when audio is playing)
│   │   │   ├── AudioControls:  Stack backgroundColor="rgba(0,0,0,0.8)" borderRadius="$4" padding="$3" alignItems="center" gap="$3"
│   │   │   │   ├── PlayPauseButton: Button size={44} icon={Play/Pause} backgroundColor="$primary" borderRadius="$2"
│   │   │   │   ├── AudioProgress: YStack fle ={1} height={4} backgroundColor="$gray6" borderRadius="$1"
│   │   │   │   │   └── AudioProgressFill: YStack height={4} backgroundColor="$primary" borderRadius="$1"
│   │   │   │   ├── AudioTime: Te t fontSize="$2" color="$white" minWidth={40}
│   │   │   │   └── CloseButton: Button size={32} icon={ } color="$white" chromeless
│   │   │   └── AudioWaveform: YStack height={20} backgroundColor="rgba(255,255,255,0.1)" borderRadius="$2" (optional visual indicator)
│   │   ├── AvatarPlaceholder: YStack position="absolute" bottom={20} right={20} width={60} height={60} backgroundColor="$color3" borderRadius={30}
│   │   │   └── PersonIcon: Icon size={24} color="$color11"
│   │   └── VideoControlsOverlay: YStack position="absolute" inset={0} backgroundColor="rgba(0,0,0,0.3)" (conditional visibility)
│   │       ├── CenterControls:  Stack justifyContent="center" alignItems="center" gap="$4"
│   │       │   ├── RewindButton: Button chromeless icon={SkipBack} size={60} backgroundColor="rgba(0,0,0,0.6)" borderRadius={30}
│   │       │   ├── PlayPauseButton: Button chromeless icon={Play/Pause} size={80} backgroundColor="rgba(0,0,0,0.6)" borderRadius={40}
│   │       │   └── FastForwardButton: Button chromeless icon={SkipForward} size={60} backgroundColor="rgba(0,0,0,0.6)" borderRadius={30}
│   │       └── BottomControls: YStack paddingHorizontal="$4" paddingBottom="$4"
│   │           ├── TimeDisplay:  Stack justifyContent="space-between" marginBottom="$2"
│   │           │   ├── CurrentTime: Te t fontSize="$3" color="$color12"
│   │           │   └── TotalTime: Te t fontSize="$3" color="$color12"
│   │           ├── ProgressTrack: YStack height={4} backgroundColor="$color3" borderRadius={2}
│   │           │   └── ProgressFill: YStack height="100%" backgroundColor="$yellow9" borderRadius={2}
│   │           └── FullscreenButton: Button chromeless icon={Ma imize} size={44} color="$color12"
│   └── SocialIcons: YStack position="absolute" right={-60} top={100} gap="$4" (when bottomSheet e panded)
│       ├── LikeIcon: YStack alignItems="center" gap="$1"
│       │   ├── HeartIcon: Icon size={24} color="$color12"
│       │   └── Count: Te t "1100" fontSize="$3" color="$color12"
│       ├── CommentIcon: YStack alignItems="center" gap="$1"
│       │   ├── CommentBubble: Icon size={24} color="$color12"
│       │   └── Count: Te t "13" fontSize="$3" color="$color12"
│       ├── BookmarkIcon: YStack alignItems="center" gap="$1"
│       │   ├── Bookmark: Icon size={24} color="$color12"
│       │   └── Count: Te t "1100" fontSize="$3" color="$color12"
│       └── ShareIcon: YStack alignItems="center" gap="$1"
│           ├── Share: Icon size={24} color="$color12"
│           └── Count: Te t "224" fontSize="$3" color="$color12"
├── ActionButtons:  Stack gap="$3" marginTop="$6" paddingHorizontal="$4" (processing state only)
│   ├── CancelButton: Button variant="outlined" size="$4" fle ={1}
│   └── ViewResultsButton: Button variant="primary" size="$4" fle ={1} disabled={!isComplete}
└── BottomSheet: YStack position="absolute" bottom={0} left={0} right={0} height="40%" backgroundColor="$background" borderTopLeftRadius="$4" borderTopRightRadius="$4" (e pandable)
    ├── SheetHandle: YStack width={40} height={4} backgroundColor="$color11" borderRadius={2} alignSelf="center" marginTop="$2" marginBottom="$3"
    ├── VideoProgressBar: YStack height={4} backgroundColor="$purple9" borderRadius={2} marginHorizontal="$4" marginBottom="$3" (when e panded)
    ├── TabNavigation:  Stack paddingHorizontal="$4" paddingBottom="$3" borderBottomWidth={1} borderBottomColor="$borderColor"
    │   ├── FeedbackTab: Button chromeless fle ={1} paddingVertical="$3"
    │   │   └── TabTe t: Te t "Feedback" fontSize="$4" fontWeight="600" color="$purple9" (active)
    │   ├── InsightsTab: Button chromeless fle ={1} paddingVertical="$3"
    │   │   └── TabTe t: Te t "Insights" fontSize="$4" color="$color11"
    │   └── CommentsTab: Button chromeless fle ={1} paddingVertical="$3"
    │       └── TabTe t: Te t "Comments" fontSize="$4" color="$color11"
    └── FeedbackContent: ScrollView fle ={1} paddingHorizontal="$4" paddingTop="$3"
        └── FeedbackItem: YStack paddingVertical="$3" borderBottomWidth={1} borderBottomColor="$borderColor"
            ├── Timestamp: Te t fontSize="$3" color="$color10" marginBottom="$1"
            ├── Category: Te t fontSize="$3" color="$color11" marginBottom="$2"
            ├── FeedbackTe t: Te t fontSize="$4" color="$color12"
            └── HighlightedTe t: Te t fontSize="$4" fontWeight="600" color="$color12" (karaoke-style)
```

- [x] **Tamagui Component Mapping**: Complete component mapping across all 5 wireframe states
  - [x] **Layout Components**: YStack,  Stack, ScrollView, SafeAreaView
  - [x] **Interactive Components**: Button, Progress, Spinner, Pressable
  - [x] **Display Components**: Te t, Image, Circle, Avatar
  - [x] **Overlay Components**: Positioned overlays, BottomSheet, Canvas/SVG
  - [x] **Custom Components**: VideoPlayer, ProgressBar, FeedbackBubble, MotionCaptureOverlay, SocialIconGroup
  - [x] **State-Specific Components**:
    - ProcessingOverlay: Spinner + Progress + Status te t
    - MotionCaptureOverlay: Skeleton nodes + connections
    - VideoControlsOverlay: Play/pause + seek controls
    - FeedbackBubbles: Speech bubble components with positioning
    - AudioFeedbackOverlay: Audio playback controls with progress and waveform
    - BottomSheet: E pandable panel with tabs and timeline
    - SocialIcons: Like, comment, bookmark, share with counts

- [x] **Design System Integration**: Theme tokens and styling consistency
  - [x] **Colors**:
    - Primary: `$primary` for progress bar and active states
    - Background: `$background` for main container
    - Overlay: `rgba(0,0,0,0.5)` for loading overlay
    - Te t: `$gray12` for primary te t, `$gray11` for secondary
  - [x] **Typography**:
    - Video title: `fontSize="$4"` with `fontWeight="600"`
    - Time display: `fontSize="$2"` with `color="$gray11"`
    - Feedback te t: `fontSize="$3"` with `color="$gray12"`
  - [x] **Spacing**:
    - Container padding: `$4` for consistent spacing
    - Control spacing: `$2` between related elements
    - Touch targets: minimum 44 44p  for accessibility
  - [x] **Sizes**:
    - Play button: 80 80p  (primary action)
    - Secondary buttons: 60 60p
    - Icon buttons: 44 44p  (accessibility minimum)
  - [x] **Borders**:
    - Progress bar: `borderRadius="$1"` for subtle rounding
    - Bottom sheet handle: `borderRadius="$2"` for visual separation

- [x] **Responsive Design Requirements**: Breakpoint behavior analysis
  - [x] **Mobile (< 768p )**: Full-screen video, bottom controls, touch gestures
  - [x] **Tablet (768p  - 1024p )**: Larger video area, enhanced touch targets
  - [x] **Desktop (> 1024p )**: Hover states, keyboard shortcuts, larger controls

## Interactive Elements Analysis Phase
- [x] **Button States and Variants**: Complete interaction mapping across all wireframe states
  - [x] **Primary Actions**:
    - Play/Pause button: 80p  size, prominent styling, center-positioned
    - Processing actions: Cancel (outlined) + View Results (primary, disabled until complete)
  - [x] **Secondary Actions**:
    - Rewind/FastForward: 60p  size, subtle styling, flanking play button
    - Social actions: Like, comment, bookmark, share with count displays
  - [x] **Icon Buttons**: Back, menu, fullscreen with chromeless variant (44p  minimum)
  - [x] **State Variations**:
    - Default: Standard button appearance
    - Hover (web): Subtle background color change
    - Pressed: Scale down animation (0.95)
    - Disabled: Reduced opacity (0.5) and no interaction
    - Loading: Spinner overlay on button
    - Processing: Progress indication with estimated time
  - [x] **Touch Target Requirements**:
    - All buttons: Minimum 44 44p  touch area
    - Video controls: 60-80p  for primary actions
    - Tab navigation: Full-width touch areas
    - Progress bar: 44p  height for draggable interaction

- [x] **Form Elements**: Progress bar and time display
  - [x] **Progress Bar**:
    - Track: Light gray background (`$gray6`)
    - Fill: Primary color (`$primary`)
    - Thumb: Draggable circle with primary color
    - Hover states: Slightly larger thumb on web
  - [x] **Time Display**:
    - Current time: Left-aligned, gray te t
    - Total time: Right-aligned, gray te t
    - Format: MM:SS for times under 1 hour, HH:MM:SS for longer

- [x] **Navigation Elements**: Screen transitions and routing
  - [x] **Back Button**: Returns to previous screen with smooth transition
  - [x] **Menu Button**: Triggers bottom sheet with options
  - [x] **Fullscreen Toggle**: E pands video to full screen (web) or rotates (native)
  - [x] **Deep Linking**: Video URLs with timestamp parameters

## Animation and Micro-interactions Phase
- [x] **Transition Animations**: Screen and component transitions
  - [x] **Control Auto-hide**: Fade out after 3 seconds of inactivity
  - [x] **Control Show**: Fade in on tap/touch with smooth transition
  - [x] **Button Press**: Scale animation (0.95) for tactile feedback
  - [x] **Progress Bar**: Smooth progress updates with easing
  - [x] **Bottom Sheet**: Smooth slide up/down with spring animation

- [x] **Loading States**: Progress indication and skeleton screens
  - [x] **Video Loading**: Spinner overlay with semi-transparent background
  - [x] **Buffering**: Progress indicator on progress bar
  - [x] **Error States**: Error message with retry button

## Cross-Platform UI Considerations Phase
- [x] **Platform-Specific Adaptations**: Native feel on each platform
  - [x] **iOS Adaptations**:
    - Native video player controls integration
    - Haptic feedback on button presses
    - Safe area handling for notched devices
  - [x] **Android Adaptations**:
    - Material Design button styling
    - System navigation bar integration
    - Back button handling
  - [x] **Web Adaptations**:
    - Hover states for all interactive elements
    - Keyboard shortcuts (spacebar for play/pause)
    - Right-click conte t menu handling

- [x] **Component Platform Variants**: When to use platform-specific implementations
  - [x] **Native-Only Components**:
    - `react-native-video` for video playback
    - Native haptic feedback
    - System-level fullscreen
  - [x] **Web-Only Components**:
    - HTML5 `<video>` element
    - Browser fullscreen API
    - Keyboard event handling
  - [x] **Shared Components**:
    - Tamagui-based UI components
    - Business logic and state management
    - Animation and styling system

## TDD UI Implementation Roadmap

### Phase 1: TDD Component Foundation [Native/Web] ⚠️ BASIC (Props Defined, Tests Minimal)
- [x] **Component Interface Tests**: Define props and styling contracts for all 5 wireframe states
  - [x] VideoAnalysisScreen props: `videoId`, `status`, `onBack`, `onMenuPress`
  - [x] ProcessingOverlay props: `progress`, `currentStep`, `estimatedTime`, `onCancel`
  - [x] VideoPlayer props: `videoUri`, `onPlay`, `onPause`, `onSeek`, `poseData`
  - [x] MotionCaptureOverlay props: `poseData`, `isVisible`, `confidence`
  - [x] VideoControls props: `isPlaying`, `currentTime`, `duration`, `showControls`
  - [x] FeedbackBubbles props: `messages`, `onBubbleTap`, `position`
  - [x] AudioFeedbackOverlay props: `audioUrl`, `isPlaying`, `currentTime`, `duration`, `onPlayPause`, `onSeek`, `onClose`
  - [x] BottomSheet props: `isE panded`, `activeTab`, `feedbackItems`, `onTabChange`
  - [x] SocialIcons props: `likes`, `comments`, `bookmarks`, `shares`, `onAction`
- [x] **Theme Integration Tests**: Validate design system compliance across all states
- [x] **Responsive Layout Tests**: Ensure breakpoint behavior for all components
- [x] **Accessibility Foundation Tests**: WCAG compliance for complete screen

### Phase 2: TDD Interactive Elements [Native/Web] ❌ MISSING
- [ ] **User Interaction Tests**: Validate touch/click behavior across all states
  - [ ] Processing state: Cancel/View Results button interactions
  - [ ] Playback state: Play/pause, rewind, fast-forward interactions
  - [ ] Controls overlay: Auto-hide/show, seek bar interactions
  - [ ] Feedback bubbles: Tap for details, positioning validation
  - [ ] Bottom sheet: Drag to e pand/collapse, tab switching
  - [ ] Social icons: Like, comment, bookmark, share interactions
- [ ] **State Transition Tests**: Validate smooth transitions between wireframe states
- [ ] **Gesture Handling Tests**: Pan, tap, long press, swipe gestures
- [ ] **Animation Tests**: Transition timing and performance for all interactions

### Phase 3: TDD State Management Integration [Native/Web] ❌ MISSING
- [ ] **Video Processing State Tests**: Processing → Ready → Playing state flow
- [ ] **Feedback Synchronization Tests**: Real-time feedback with video timeline
- [ ] **Bottom Sheet State Tests**: Collapsed → E panded → Tab switching
- [ ] **Motion Capture Tests**: Pose data rendering and skeleton visualization
- [ ] **Social Interaction Tests**: Like/comment/share state management

### Phase 4: TDD Cross-Platform Parity [Native/Web] ❌ MISSING
- [ ] **Visual Parity Tests**: Identical rendering across platforms for all 5 states
- [ ] **Interaction Parity Tests**: Consistent behavior patterns
- [ ] **Performance Tests**: Render time < 16ms, smooth animations, motion capture at 60fps
- [ ] **Accessibility Tests**: Platform-specific accessibility features for complete screen

## Quality Gates
- [x] **Visual Regression Testing**: Screenshot comparison tests ⚠️ BASIC (Only render tests)
- [x] **Accessibility Compliance**: WCAG 2.2 AA validation ⚠️ FOUNDATION (Test IDs present, full compliance missing)
- [x] **Performance Benchmarks**: Render time < 16ms, smooth animations ⚠️ FOUNDATION (No measurements)
- [x] **Cross-Platform Consistency**: Identical user e perience ✅ COMPLETE (Platform variants implemented)

## Current Implementation Status

### ✅ **COMPLETED COMPONENTS (85% Complete)**
- **All 5 Wireframe States**: Processing, playback, controls overlay, bottom sheet implemented
- **Component Architecture**: All UI components built with Tamagui
- **Design System**: Theme tokens, responsive design, touch targets implemented
- **Interactive Elements**: Button states, form controls, navigation elements
- **Cross-Platform**: Platform-specific video players and adaptations
- **Animation Foundation**: Control auto-hide, button press feedback implemented

### ⚠️ **PARTIALLY IMPLEMENTED (Props & Basic Structure)**
- **TDD Coverage**: Phase 1 foundation complete, comprehensive tests missing
- **Animation System**: Basic transitions, advanced animations need implementation
- **Test Infrastructure**: Component interfaces defined, interaction tests missing

### ❌ **MISSING COMPONENTS**
- **Advanced TDD**: Phases 2-4 test suites completely missing
- **Interaction Testing**: Real user interaction validation not implemented
- **Performance Testing**: No benchmark measurements or regression testing
- **Animation Library**: No explicit animation system (relying on CSS/native)

### 🔧 **IMMEDIATE NEXT STEPS**
1. **Complete TDD Coverage**: Implement Phase 2-4 test suites for all interactions
2. **Animation System**: Add explicit animation library and advanced transitions
3. **Performance Testing**: Implement render time measurements and benchmarks
4. **Interaction Testing**: Add comprehensive user interaction validation

## Documentation Requirements
- [x] **Storybook Stories**: All component states and variants documented ⚠️ PARTIAL (Stories exist but basic)
- [x] **Design System Usage**: Theme token usage and component patterns ✅ COMPLETE
- [x] **Accessibility Documentation**: Screen reader testing results ⚠️ FOUNDATION (Test IDs implemented)
- [x] **Animation Documentation**: Transition timing and easing functions ⚠️ PARTIAL (Basic transitions only)

## Unified Component Interface Specifications

### Core Screen Component
```typescript
interface VideoAnalysisScreenProps {
  videoId: string
  initialStatus: 'processing' | 'ready' | 'playing' | 'paused'
  onBack: () => void
  onMenuPress: () => void
  onCancel?: () => void
  onViewResults?: () => void
}

interface VideoAnalysisState {
  status: 'processing' | 'ready' | 'playing' | 'paused'
  progress: number
  currentTime: number
  duration: number
  showControls: boolean
  bottomSheetE panded: boolean
  activeTab: 'feedback' | 'insights' | 'comments'
  poseData: PoseData[]
  feedbackMessages: FeedbackMessage[]
  socialStats: SocialStats
}
```

### State-Specific Components
```typescript
// Processing State Components
interface ProcessingOverlayProps {
  progress: number
  currentStep: string
  estimatedTime: number
  onCancel: () => void
  onViewResults: () => void
  isComplete: boolean
  videoSource: 'live_recording' | 'uploaded_video' | null
  processingMethod: 'vision_camera' | 'video_processing' | null
  frameExtractionProgress?: number
  totalFrames?: number
  processedFrames?: number
}

// Motion Capture Components
interface MotionCaptureOverlayProps {
  poseData: PoseData[]
  isVisible: boolean
  confidence: number
  onNodeTap?: (nodeId: string) => void
}

interface PoseData {
  id: string
  timestamp: number
  joints: Joint[]
  confidence: number
  metadata?: {
    source: 'live_recording' | 'uploaded_video'
    processingMethod: 'vision_camera' | 'video_processing'
    frameIndex?: number
    originalTimestamp?: number
  }
}

interface Joint {
  id: string
   : number
  y: number
  confidence: number
  connections: string[]
}

// Feedback Components
interface FeedbackBubblesProps {
  messages: FeedbackMessage[]
  onBubbleTap: (message: FeedbackMessage) => void
  position: 'overlay' | 'sidebar'
}

interface AudioFeedbackOverlayProps {
  audioUrl: string | null
  isPlaying: boolean
  currentTime: number
  duration: number
  onPlayPause: () => void
  onSeek: (time: number) => void
  onClose: () => void
  isVisible: boolean
}

interface FeedbackMessage {
  id: string
  timestamp: number
  te t: string
  type: 'positive' | 'suggestion' | 'correction'
  category: 'voice' | 'posture' | 'grip' | 'movement'
  position: {  : number; y: number }
  isHighlighted: boolean
  isActive: boolean
}

// Bottom Sheet Components
interface BottomSheetProps {
  isE panded: boolean
  activeTab: 'feedback' | 'insights' | 'comments'
  feedbackItems: FeedbackItem[]
  onTabChange: (tab: string) => void
  onSheetE pand: () => void
  onSheetCollapse: () => void
  onFeedbackItemPress: (item: FeedbackItem) => void
}

// Social Components
interface SocialIconsProps {
  likes: number
  comments: number
  bookmarks: number
  shares: number
  onLike: () => void
  onComment: () => void
  onBookmark: () => void
  onShare: () => void
  isVisible: boolean
}
```

## Comprehensive Test Scenarios

### Processing State Tests
```typescript
describe('Video Processing State', () => {
  it('displays processing overlay with progress', () => {
    render(<VideoAnalysisScreen status="processing" progress={0.5} />)
    e pect(screen.getByTe t('50% complete')).toBeInTheDocument()
  })

  it('handles cancel action with confirmation', () => {
    const onCancel = jest.fn()
    render(<VideoAnalysisScreen status="processing" onCancel={onCancel} />)
    
    fireEvent.press(screen.getByTe t('Cancel'))
    e pect(onCancel).toHaveBeenCalled()
  })

  it('enables view results when processing complete', () => {
    render(<VideoAnalysisScreen status="processing" isComplete={true} />)
    
    const viewResultsButton = screen.getByTe t('View Results')
    e pect(viewResultsButton).not.toBeDisabled()
  })
})
```

### Motion Capture Tests
```typescript
describe('Motion Capture Overlay', () => {
  const mockPoseData = [
    {
      id: '1',
      timestamp: 1000,
      joints: [
        { id: 'nose',  : 100, y: 50, confidence: 0.9, connections: ['leftEye', 'rightEye'] }
      ],
      confidence: 0.9
    }
  ]

  it('renders skeleton nodes and connections', () => {
    render(<MotionCaptureOverlay poseData={mockPoseData} isVisible={true} />)
    
    e pect(screen.getByTestId('skeleton-nodes')).toBeInTheDocument()
    e pect(screen.getByTestId('skeleton-connections')).toBeInTheDocument()
  })

  it('updates pose data in real-time', () => {
    const { rerender } = render(<MotionCaptureOverlay poseData={mockPoseData} />)
    
    const updatedPoseData = [...mockPoseData, { id: '2', timestamp: 2000, joints: [], confidence: 0.8 }]
    rerender(<MotionCaptureOverlay poseData={updatedPoseData} />)
    
    e pect(screen.getAllByTestId('pose-frame')).toHaveLength(2)
  })
})
```

### Video Controls Tests
```typescript
describe('Video Controls Overlay', () => {
  it('shows play button when paused', () => {
    render(<VideoControlsOverlay isPlaying={false} />)
    e pect(screen.getByTestId('play-button')).toBeInTheDocument()
  })

  it('shows pause button when playing', () => {
    render(<VideoControlsOverlay isPlaying={true} />)
    e pect(screen.getByTestId('pause-button')).toBeInTheDocument()
  })

  it('auto-hides controls after 3 seconds', async () => {
    render(<VideoControlsOverlay showControls={true} />)
    
    await waitFor(() => {
      e pect(screen.queryByTestId('video-controls-overlay')).not.toBeVisible()
    }, { timeout: 4000 })
  })

  it('handles progress bar seeking', () => {
    const onSeek = jest.fn()
    render(<VideoControlsOverlay onSeek={onSeek} duration={100} />)
    
    const progressBar = screen.getByTestId('progress-bar')
    fireEvent.press(progressBar, { nativeEvent: { location : 50 } })
    
    e pect(onSeek).toHaveBeenCalledWith(50)
  })
})
```

### Bottom Sheet Tests
```typescript
describe('Bottom Sheet Feedback Panel', () => {
  it('e pands to 40% screen height', () => {
    render(<BottomSheet isE panded={true} />)
    
    const bottomSheet = screen.getByTestId('bottom-sheet')
    e pect(bottomSheet).toHaveStyle({ height: '40%' })
  })

  it('handles tab switching', () => {
    const onTabChange = jest.fn()
    render(<BottomSheet activeTab="feedback" onTabChange={onTabChange} />)
    
    fireEvent.press(screen.getByTe t('Insights'))
    e pect(onTabChange).toHaveBeenCalledWith('insights')
  })

  it('displays karaoke-style highlighting', () => {
    const feedbackItems = [
      { id: '1', te t: 'Great posture!', isHighlighted: true, isActive: true }
    ]
    render(<BottomSheet feedbackItems={feedbackItems} />)
    
    const highlightedTe t = screen.getByTe t('Great posture!')
    e pect(highlightedTe t).toHaveStyle({ fontWeight: '600' })
  })

  it('makes tabs sticky on scroll', () => {
    render(<BottomSheet isE panded={true} />)
    
    const scrollView = screen.getByTestId('feedback-content')
    fireEvent.scroll(scrollView, { nativeEvent: { contentOffset: { y: 100 } } })
    
    const tabNavigation = screen.getByTestId('tab-navigation')
    e pect(tabNavigation).toHaveStyle({ position: 'sticky' })
  })
})
```

### Social Icons Tests
```typescript
describe('Social Icons', () => {
  it('displays correct counts', () => {
    render(<SocialIcons likes={1100} comments={13} bookmarks={1100} shares={224} />)
    
    e pect(screen.getByTe t('1100')).toBeInTheDocument() // likes
    e pect(screen.getByTe t('13')).toBeInTheDocument() // comments
    e pect(screen.getByTe t('224')).toBeInTheDocument() // shares
  })

  it('handles social interactions', () => {
    const onLike = jest.fn()
    render(<SocialIcons onLike={onLike} />)
    
    fireEvent.press(screen.getByTestId('like-button'))
    e pect(onLike).toHaveBeenCalled()
  })
})
```

## Cross-References
- **Feature Logic**: See `analysis-feature.md` for state management and business logic
- **Backend Integration**: See `analysis-backend.md` for video data requirements
- **Platform Specifics**: See `analysis-platform.md` for implementation details
- **User Stories**: See `docs/spec/user_stories/P0/02_video_analysis_feedback_system.md` for requirements
