# Video Analysis & Feedback System - Complete UI/UX Analysis

> **Instructions**: This analysis consolidates all 5 wireframes (02a-02e) into a unified Video Analysis & Feedback System screen. It covers video processing, playback with motion capture, interactive controls, and feedback panel integration. Cross-reference with `analysis-feature.md` for business logic and `analysis-backend.md` for data requirements.

## Wireframe Integration Overview

This screen encompasses five distinct states/interactions:
1. **02a_video_processing.png**: Initial video processing with AI analysis
2. **02b_video_playback.png**: Video playback with motion capture overlay and AI feedback bubbles
3. **02c_video_ontap_played.png**: Video controls overlay in playing state
4. **02d_video_ontap_paused.png**: Video controls overlay in paused state  
5. **02e_video_bottom_sheet.png**: Expanded feedback panel with timeline and social features

## Test-Driven UI Component Analysis Phase
- [x] **Visual Component Test Scenarios**: Define component rendering and styling tests
  - [x] Write snapshot tests for each component state (idle, loading, error, success)
  - [x] Define responsive breakpoint tests (mobile, tablet, desktop)
  - [x] Test theme integration and token usage validation
  - [x] Document animation and transition test scenarios
- [x] **User Interaction Test Scenarios**: Define what users should be able to do
  - [x] Write test scenarios for each user interaction (tap, swipe, type, scroll)
  - [x] Define expected visual feedback for each interaction (hover, press, focus)
  - [x] Identify touch target size requirements (44px minimum)
  - [x] Document gesture handling tests (pan, pinch, long press)
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
YStack flex={1} backgroundColor="$background"
├── Header: XStack height={60} paddingHorizontal="$4" alignItems="center" backgroundColor="$color2"
│   ├── BackButton: Button chromeless size={44} icon={ChevronLeft} color="$color12"
│   ├── TitleSection: YStack flex={1} alignItems="center"
│   │   ├── MainTitle: Text fontSize="$5" fontWeight="600" color="$color12" textAlign="center"
│   │   └── Subtitle: Text fontSize="$3" color="$color11" (conditional: "10 days ago")
│   └── MenuButton: Button chromeless size={44} icon={MoreVertical} color="$color12"
├── VideoArea: YStack flex={1} position="relative" backgroundColor="$color1"
│   ├── ProcessingState: YStack (when status === 'processing')
│   │   ├── VideoThumbnail: YStack width="100%" aspectRatio={16/9} backgroundColor="$backgroundSubtle" borderRadius="$4"
│   │   ├── ProcessingOverlay: YStack position="absolute" inset={0} backgroundColor="rgba(0,0,0,0.6)" justifyContent="center" alignItems="center"
│   │   │   ├── ProcessingSpinner: Spinner size="large" color="$blue9"
│   │   ├── PipelineStageIndicator: YStack
│   │   │   ├── FrameExtractionStage: Text "Extracting frames..." (Stage 1/5)
│   │   │   ├── PoseDetectionStage: Text "Analyzing movement..." (Stage 2/5)
│   │   │   ├── VideoAnalysisStage: Text "Processing video/voice..." (Stage 3/5)
│   │   │   ├── LLMFeedbackStage: Text "Generating feedback..." (Stage 4/5)
│   │   │   └── TTSGenerationStage: Text "Creating audio..." (Stage 5/5)
│   │   │   └── ProgressBar: Progress with stage-specific progress width="80%" height={4} backgroundColor="$backgroundSubtle"
│   │   └── AnalysisStatus: YStack gap="$3" marginTop="$6"
│   │       ├── StatusTitle: Text fontSize="$5" fontWeight="600" textAlign="center"
│   │       ├── StatusDescription: Text fontSize="$4" color="$color11" textAlign="center"
│   │       └── EstimatedTime: Text fontSize="$3" color="$color10" textAlign="center"
│   ├── PlaybackState: YStack (when status === 'ready' || 'playing')
│   │   ├── VideoPlayer: Platform-specific video component (full background)
│   │   │   ├── Native: react-native-video
│   │   │   └── Web: HTML5 <video> element
│   │   ├── MotionCaptureOverlay: YStack position="absolute" inset={0} pointerEvents="none"
│   │   │   ├── SkeletonNodes: Array of Circle components (white, 8px radius)
│   │   │   └── SkeletonConnections: Array of Line components (gray, 2px width)
│   │   ├── FeedbackBubbles: YStack position="absolute" bottom={100} right={20} gap="$3"
│   │   │   ├── SmallBubble: YStack backgroundColor="$color3" padding="$3" borderRadius="$3" maxWidth={120}
│   │   │   │   └── Text: "Nice grip!" fontSize="$4" color="$color12"
│   │   │   └── LargeBubble: YStack backgroundColor="$color3" padding="$4" borderRadius="$3" maxWidth={200}
│   │   │       └── Text: "Bend you knees a little bit and keep your back straight!" fontSize="$4" color="$color12"
│   │   ├── AudioFeedbackOverlay: YStack position="absolute" bottom={100} left="$4" right="$4" (when audio is playing)
│   │   │   ├── AudioControls: XStack backgroundColor="rgba(0,0,0,0.8)" borderRadius="$4" padding="$3" alignItems="center" gap="$3"
│   │   │   │   ├── PlayPauseButton: Button size={44} icon={Play/Pause} backgroundColor="$primary" borderRadius="$2"
│   │   │   │   ├── AudioProgress: YStack flex={1} height={4} backgroundColor="$gray6" borderRadius="$1"
│   │   │   │   │   └── AudioProgressFill: YStack height={4} backgroundColor="$primary" borderRadius="$1"
│   │   │   │   ├── AudioTime: Text fontSize="$2" color="$white" minWidth={40}
│   │   │   │   └── CloseButton: Button size={32} icon={X} color="$white" chromeless
│   │   │   └── AudioWaveform: YStack height={20} backgroundColor="rgba(255,255,255,0.1)" borderRadius="$2" (optional visual indicator)
│   │   ├── AvatarPlaceholder: YStack position="absolute" bottom={20} right={20} width={60} height={60} backgroundColor="$color3" borderRadius={30}
│   │   │   └── PersonIcon: Icon size={24} color="$color11"
│   │   └── VideoControlsOverlay: YStack position="absolute" inset={0} backgroundColor="rgba(0,0,0,0.3)" (conditional visibility)
│   │       ├── CenterControls: XStack justifyContent="center" alignItems="center" gap="$4"
│   │       │   ├── RewindButton: Button chromeless icon={SkipBack} size={60} backgroundColor="rgba(0,0,0,0.6)" borderRadius={30}
│   │       │   ├── PlayPauseButton: Button chromeless icon={Play/Pause} size={80} backgroundColor="rgba(0,0,0,0.6)" borderRadius={40}
│   │       │   └── FastForwardButton: Button chromeless icon={SkipForward} size={60} backgroundColor="rgba(0,0,0,0.6)" borderRadius={30}
│   │       └── BottomControls: YStack paddingHorizontal="$4" paddingBottom="$4"
│   │           ├── TimeDisplay: XStack justifyContent="space-between" marginBottom="$2"
│   │           │   ├── CurrentTime: Text fontSize="$3" color="$color12"
│   │           │   └── TotalTime: Text fontSize="$3" color="$color12"
│   │           ├── ProgressTrack: YStack height={4} backgroundColor="$color3" borderRadius={2}
│   │           │   └── ProgressFill: YStack height="100%" backgroundColor="$yellow9" borderRadius={2}
│   │           └── FullscreenButton: Button chromeless icon={Maximize} size={44} color="$color12"
│   └── SocialIcons: YStack position="absolute" right={-60} top={100} gap="$4" (when bottomSheet expanded)
│       ├── LikeIcon: YStack alignItems="center" gap="$1"
│       │   ├── HeartIcon: Icon size={24} color="$color12"
│       │   └── Count: Text "1100" fontSize="$3" color="$color12"
│       ├── CommentIcon: YStack alignItems="center" gap="$1"
│       │   ├── CommentBubble: Icon size={24} color="$color12"
│       │   └── Count: Text "13" fontSize="$3" color="$color12"
│       ├── BookmarkIcon: YStack alignItems="center" gap="$1"
│       │   ├── Bookmark: Icon size={24} color="$color12"
│       │   └── Count: Text "1100" fontSize="$3" color="$color12"
│       └── ShareIcon: YStack alignItems="center" gap="$1"
│           ├── Share: Icon size={24} color="$color12"
│           └── Count: Text "224" fontSize="$3" color="$color12"
├── ActionButtons: XStack gap="$3" marginTop="$6" paddingHorizontal="$4" (processing state only)
│   ├── CancelButton: Button variant="outlined" size="$4" flex={1}
│   └── ViewResultsButton: Button variant="primary" size="$4" flex={1} disabled={!isComplete}
└── BottomSheet: YStack position="absolute" bottom={0} left={0} right={0} height="40%" backgroundColor="$background" borderTopLeftRadius="$4" borderTopRightRadius="$4" (expandable)
    ├── SheetHandle: YStack width={40} height={4} backgroundColor="$color11" borderRadius={2} alignSelf="center" marginTop="$2" marginBottom="$3"
    ├── VideoProgressBar: YStack height={4} backgroundColor="$purple9" borderRadius={2} marginHorizontal="$4" marginBottom="$3" (when expanded)
    ├── TabNavigation: XStack paddingHorizontal="$4" paddingBottom="$3" borderBottomWidth={1} borderBottomColor="$borderColor"
    │   ├── FeedbackTab: Button chromeless flex={1} paddingVertical="$3"
    │   │   └── TabText: Text "Feedback" fontSize="$4" fontWeight="600" color="$purple9" (active)
    │   ├── InsightsTab: Button chromeless flex={1} paddingVertical="$3"
    │   │   └── TabText: Text "Insights" fontSize="$4" color="$color11"
    │   └── CommentsTab: Button chromeless flex={1} paddingVertical="$3"
    │       └── TabText: Text "Comments" fontSize="$4" color="$color11"
    └── FeedbackContent: ScrollView flex={1} paddingHorizontal="$4" paddingTop="$3"
        └── FeedbackItem: YStack paddingVertical="$3" borderBottomWidth={1} borderBottomColor="$borderColor"
            ├── Timestamp: Text fontSize="$3" color="$color10" marginBottom="$1"
            ├── Category: Text fontSize="$3" color="$color11" marginBottom="$2"
            ├── FeedbackText: Text fontSize="$4" color="$color12"
            └── HighlightedText: Text fontSize="$4" fontWeight="600" color="$color12" (karaoke-style)
```

- [x] **Tamagui Component Mapping**: Complete component mapping across all 5 wireframe states
  - [x] **Layout Components**: YStack, XStack, ScrollView, SafeAreaView
  - [x] **Interactive Components**: Button, Progress, Spinner, Pressable
  - [x] **Display Components**: Text, Image, Circle, Avatar
  - [x] **Overlay Components**: Positioned overlays, BottomSheet, Canvas/SVG
  - [x] **Custom Components**: VideoPlayer, ProgressBar, FeedbackBubble, MotionCaptureOverlay, SocialIconGroup
  - [x] **State-Specific Components**:
    - ProcessingOverlay: Spinner + Progress + Status text
    - MotionCaptureOverlay: Skeleton nodes + connections
    - VideoControlsOverlay: Play/pause + seek controls
    - FeedbackBubbles: Speech bubble components with positioning
    - AudioFeedbackOverlay: Audio playback controls with progress and waveform
    - BottomSheet: Expandable panel with tabs and timeline
    - SocialIcons: Like, comment, bookmark, share with counts

- [x] **Design System Integration**: Theme tokens and styling consistency
  - [x] **Colors**: 
    - Primary: `$primary` for progress bar and active states
    - Background: `$background` for main container
    - Overlay: `rgba(0,0,0,0.5)` for loading overlay
    - Text: `$gray12` for primary text, `$gray11` for secondary
  - [x] **Typography**: 
    - Video title: `fontSize="$4"` with `fontWeight="600"`
    - Time display: `fontSize="$2"` with `color="$gray11"`
    - Feedback text: `fontSize="$3"` with `color="$gray12"`
  - [x] **Spacing**: 
    - Container padding: `$4` for consistent spacing
    - Control spacing: `$2` between related elements
    - Touch targets: minimum 44x44px for accessibility
  - [x] **Sizes**: 
    - Play button: 80x80px (primary action)
    - Secondary buttons: 60x60px
    - Icon buttons: 44x44px (accessibility minimum)
  - [x] **Borders**: 
    - Progress bar: `borderRadius="$1"` for subtle rounding
    - Bottom sheet handle: `borderRadius="$2"` for visual separation

- [x] **Responsive Design Requirements**: Breakpoint behavior analysis
  - [x] **Mobile (< 768px)**: Full-screen video, bottom controls, touch gestures
  - [x] **Tablet (768px - 1024px)**: Larger video area, enhanced touch targets
  - [x] **Desktop (> 1024px)**: Hover states, keyboard shortcuts, larger controls

## Interactive Elements Analysis Phase
- [x] **Button States and Variants**: Complete interaction mapping across all wireframe states
  - [x] **Primary Actions**: 
    - Play/Pause button: 80px size, prominent styling, center-positioned
    - Processing actions: Cancel (outlined) + View Results (primary, disabled until complete)
  - [x] **Secondary Actions**: 
    - Rewind/FastForward: 60px size, subtle styling, flanking play button
    - Social actions: Like, comment, bookmark, share with count displays
  - [x] **Icon Buttons**: Back, menu, fullscreen with chromeless variant (44px minimum)
  - [x] **State Variations**: 
    - Default: Standard button appearance
    - Hover (web): Subtle background color change
    - Pressed: Scale down animation (0.95)
    - Disabled: Reduced opacity (0.5) and no interaction
    - Loading: Spinner overlay on button
    - Processing: Progress indication with estimated time
  - [x] **Touch Target Requirements**:
    - All buttons: Minimum 44x44px touch area
    - Video controls: 60-80px for primary actions
    - Tab navigation: Full-width touch areas
    - Progress bar: 44px height for draggable interaction

- [x] **Form Elements**: Progress bar and time display
  - [x] **Progress Bar**: 
    - Track: Light gray background (`$gray6`)
    - Fill: Primary color (`$primary`)
    - Thumb: Draggable circle with primary color
    - Hover states: Slightly larger thumb on web
  - [x] **Time Display**: 
    - Current time: Left-aligned, gray text
    - Total time: Right-aligned, gray text
    - Format: MM:SS for times under 1 hour, HH:MM:SS for longer

- [x] **Navigation Elements**: Screen transitions and routing
  - [x] **Back Button**: Returns to previous screen with smooth transition
  - [x] **Menu Button**: Triggers bottom sheet with options
  - [x] **Fullscreen Toggle**: Expands video to full screen (web) or rotates (native)
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
    - Right-click context menu handling

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

### Phase 1: TDD Component Foundation [Native/Web]
- [x] **Component Interface Tests**: Define props and styling contracts for all 5 wireframe states
  - [x] VideoAnalysisScreen props: `videoId`, `status`, `onBack`, `onMenuPress`
  - [x] ProcessingOverlay props: `progress`, `currentStep`, `estimatedTime`, `onCancel`
  - [x] VideoPlayer props: `videoUri`, `onPlay`, `onPause`, `onSeek`, `poseData`
  - [x] MotionCaptureOverlay props: `poseData`, `isVisible`, `confidence`
  - [x] VideoControls props: `isPlaying`, `currentTime`, `duration`, `showControls`
  - [x] FeedbackBubbles props: `messages`, `onBubbleTap`, `position`
  - [x] AudioFeedbackOverlay props: `audioUrl`, `isPlaying`, `currentTime`, `duration`, `onPlayPause`, `onSeek`, `onClose`
  - [x] BottomSheet props: `isExpanded`, `activeTab`, `feedbackItems`, `onTabChange`
  - [x] SocialIcons props: `likes`, `comments`, `bookmarks`, `shares`, `onAction`
- [x] **Theme Integration Tests**: Validate design system compliance across all states
- [x] **Responsive Layout Tests**: Ensure breakpoint behavior for all components
- [x] **Accessibility Foundation Tests**: WCAG compliance for complete screen

### Phase 2: TDD Interactive Elements [Native/Web]
- [x] **User Interaction Tests**: Validate touch/click behavior across all states
  - [x] Processing state: Cancel/View Results button interactions
  - [x] Playback state: Play/pause, rewind, fast-forward interactions
  - [x] Controls overlay: Auto-hide/show, seek bar interactions
  - [x] Feedback bubbles: Tap for details, positioning validation
  - [x] Bottom sheet: Drag to expand/collapse, tab switching
  - [x] Social icons: Like, comment, bookmark, share interactions
- [x] **State Transition Tests**: Validate smooth transitions between wireframe states
- [x] **Gesture Handling Tests**: Pan, tap, long press, swipe gestures
- [x] **Animation Tests**: Transition timing and performance for all interactions

### Phase 3: TDD State Management Integration [Native/Web]
- [x] **Video Processing State Tests**: Processing → Ready → Playing state flow
- [x] **Feedback Synchronization Tests**: Real-time feedback with video timeline
- [x] **Bottom Sheet State Tests**: Collapsed → Expanded → Tab switching
- [x] **Motion Capture Tests**: Pose data rendering and skeleton visualization
- [x] **Social Interaction Tests**: Like/comment/share state management

### Phase 4: TDD Cross-Platform Parity [Native/Web]
- [x] **Visual Parity Tests**: Identical rendering across platforms for all 5 states
- [x] **Interaction Parity Tests**: Consistent behavior patterns
- [x] **Performance Tests**: Render time < 16ms, smooth animations, motion capture at 60fps
- [x] **Accessibility Tests**: Platform-specific accessibility features for complete screen

## Quality Gates
- [x] **Visual Regression Testing**: Screenshot comparison tests
- [x] **Accessibility Compliance**: WCAG 2.2 AA validation
- [x] **Performance Benchmarks**: Render time < 16ms, smooth animations
- [x] **Cross-Platform Consistency**: Identical user experience

## Documentation Requirements
- [x] **Storybook Stories**: All component states and variants documented
- [x] **Design System Usage**: Theme token usage and component patterns
- [x] **Accessibility Documentation**: Screen reader testing results
- [x] **Animation Documentation**: Transition timing and easing functions

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
  bottomSheetExpanded: boolean
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
}

interface Joint {
  id: string
  x: number
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
  text: string
  type: 'positive' | 'suggestion' | 'correction'
  category: 'voice' | 'posture' | 'grip' | 'movement'
  position: { x: number; y: number }
  isHighlighted: boolean
  isActive: boolean
}

// Bottom Sheet Components
interface BottomSheetProps {
  isExpanded: boolean
  activeTab: 'feedback' | 'insights' | 'comments'
  feedbackItems: FeedbackItem[]
  onTabChange: (tab: string) => void
  onSheetExpand: () => void
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
    expect(screen.getByText('50% complete')).toBeInTheDocument()
  })

  it('handles cancel action with confirmation', () => {
    const onCancel = jest.fn()
    render(<VideoAnalysisScreen status="processing" onCancel={onCancel} />)
    
    fireEvent.press(screen.getByText('Cancel'))
    expect(onCancel).toHaveBeenCalled()
  })

  it('enables view results when processing complete', () => {
    render(<VideoAnalysisScreen status="processing" isComplete={true} />)
    
    const viewResultsButton = screen.getByText('View Results')
    expect(viewResultsButton).not.toBeDisabled()
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
        { id: 'nose', x: 100, y: 50, confidence: 0.9, connections: ['leftEye', 'rightEye'] }
      ],
      confidence: 0.9
    }
  ]

  it('renders skeleton nodes and connections', () => {
    render(<MotionCaptureOverlay poseData={mockPoseData} isVisible={true} />)
    
    expect(screen.getByTestId('skeleton-nodes')).toBeInTheDocument()
    expect(screen.getByTestId('skeleton-connections')).toBeInTheDocument()
  })

  it('updates pose data in real-time', () => {
    const { rerender } = render(<MotionCaptureOverlay poseData={mockPoseData} />)
    
    const updatedPoseData = [...mockPoseData, { id: '2', timestamp: 2000, joints: [], confidence: 0.8 }]
    rerender(<MotionCaptureOverlay poseData={updatedPoseData} />)
    
    expect(screen.getAllByTestId('pose-frame')).toHaveLength(2)
  })
})
```

### Video Controls Tests
```typescript
describe('Video Controls Overlay', () => {
  it('shows play button when paused', () => {
    render(<VideoControlsOverlay isPlaying={false} />)
    expect(screen.getByTestId('play-button')).toBeInTheDocument()
  })

  it('shows pause button when playing', () => {
    render(<VideoControlsOverlay isPlaying={true} />)
    expect(screen.getByTestId('pause-button')).toBeInTheDocument()
  })

  it('auto-hides controls after 3 seconds', async () => {
    render(<VideoControlsOverlay showControls={true} />)
    
    await waitFor(() => {
      expect(screen.queryByTestId('video-controls-overlay')).not.toBeVisible()
    }, { timeout: 4000 })
  })

  it('handles progress bar seeking', () => {
    const onSeek = jest.fn()
    render(<VideoControlsOverlay onSeek={onSeek} duration={100} />)
    
    const progressBar = screen.getByTestId('progress-bar')
    fireEvent.press(progressBar, { nativeEvent: { locationX: 50 } })
    
    expect(onSeek).toHaveBeenCalledWith(50)
  })
})
```

### Bottom Sheet Tests
```typescript
describe('Bottom Sheet Feedback Panel', () => {
  it('expands to 40% screen height', () => {
    render(<BottomSheet isExpanded={true} />)
    
    const bottomSheet = screen.getByTestId('bottom-sheet')
    expect(bottomSheet).toHaveStyle({ height: '40%' })
  })

  it('handles tab switching', () => {
    const onTabChange = jest.fn()
    render(<BottomSheet activeTab="feedback" onTabChange={onTabChange} />)
    
    fireEvent.press(screen.getByText('Insights'))
    expect(onTabChange).toHaveBeenCalledWith('insights')
  })

  it('displays karaoke-style highlighting', () => {
    const feedbackItems = [
      { id: '1', text: 'Great posture!', isHighlighted: true, isActive: true }
    ]
    render(<BottomSheet feedbackItems={feedbackItems} />)
    
    const highlightedText = screen.getByText('Great posture!')
    expect(highlightedText).toHaveStyle({ fontWeight: '600' })
  })

  it('makes tabs sticky on scroll', () => {
    render(<BottomSheet isExpanded={true} />)
    
    const scrollView = screen.getByTestId('feedback-content')
    fireEvent.scroll(scrollView, { nativeEvent: { contentOffset: { y: 100 } } })
    
    const tabNavigation = screen.getByTestId('tab-navigation')
    expect(tabNavigation).toHaveStyle({ position: 'sticky' })
  })
})
```

### Social Icons Tests
```typescript
describe('Social Icons', () => {
  it('displays correct counts', () => {
    render(<SocialIcons likes={1100} comments={13} bookmarks={1100} shares={224} />)
    
    expect(screen.getByText('1100')).toBeInTheDocument() // likes
    expect(screen.getByText('13')).toBeInTheDocument() // comments
    expect(screen.getByText('224')).toBeInTheDocument() // shares
  })

  it('handles social interactions', () => {
    const onLike = jest.fn()
    render(<SocialIcons onLike={onLike} />)
    
    fireEvent.press(screen.getByTestId('like-button'))
    expect(onLike).toHaveBeenCalled()
  })
})
```

## Cross-References
- **Feature Logic**: See `analysis-feature.md` for state management and business logic
- **Backend Integration**: See `analysis-backend.md` for video data requirements
- **Platform Specifics**: See `analysis-platform.md` for implementation details
- **User Stories**: See `docs/spec/user_stories/P0/02_video_analysis_feedback_system.md` for requirements
