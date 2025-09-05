# Camera Recording Wireframe Analysis

> **Feature**: Camera Recording (01a_camera.png + 01b_recording.png)
> **User Stories**: P0/01a_camera.md, P0/01b_recording.md
> **PRD Reference**: Section 4.1 (Video Upload/Recording)
> **TRD Reference**: Component Design, Performance Requirements

## Visual Analysis Phase

### Layout Structure
**Root Container**: Full-screen vertical layout with safe area handling
```typescript
// Root Layout Structure (Both States)
YStack flex={1} backgroundColor="$background"
├── Header: XStack height={60} paddingHorizontal="$4" alignItems="center"
│   ├── Left: Button chromeless size={44x44} (hamburger/back)
│   ├── Center: Text/Timer (screen title or recording duration)
│   └── Right: Button chromeless size={44x44} (notifications)
├── CameraArea: YStack flex={1} position="relative"
│   ├── CameraPreview: Camera component (full background)
│   ├── PoseOverlay: SVG/Canvas overlay (transparent, non-blocking)
│   └── CameraControls: Positioned absolute bottom
│       ├── IDLE STATE:
│       │   ├── UploadButton: Button icon={Upload} size={60x60}
│       │   ├── RecordButton: Button variant="primary" size={80x80} (main CTA)
│       │   └── CameraSwapButton: Button icon={RotateCcw} size={60x60}
│       └── RECORDING STATE:
│           ├── CameraSettings: Button icon={Settings} size={44x44}
│           ├── ZoomControls: XStack gap="$2"
│           │   ├── ZoomButton: Button "1x" variant={active ? "primary" : "chromeless"}
│           │   ├── ZoomButton: Button "2x" variant={active ? "primary" : "chromeless"}
│           │   └── ZoomButton: Button "3x" variant={active ? "primary" : "chromeless"}
│           ├── PauseStopButton: Button size={60x60} icon={Pause/Square}
│           └── CameraSwapButton: Button icon={RotateCcw} size={44x44}
└── BottomNavigation: XStack height={80} justifyContent="space-between" paddingHorizontal="$4"
    ├── CoachTab: Button chromeless flex={1} icon={MessageCircle}
    ├── RecordTab: Button variant="primary" flex={1} icon={Circle} (active)
    └── InsightsTab: Button chromeless flex={1} icon={BarChart}
```

### Component Mapping (Tamagui Components + Expo/RN Libraries)
- **Header Container**: `XStack` with safe area padding
- **Menu/Back Button**: `Button chromeless size="$3"` with `<Menu />` or `<ChevronLeft />` icon
- **Title/Timer**: `Text fontSize="$6" fontWeight="600"` (idle) or `Text fontSize="$5" fontFamily="$mono"` (recording timer)
- **Notification Button**: `Button chromeless size="$3"` with badge overlay using `Circle` positioned absolute
- **Camera Preview**: `Camera` from `expo-camera` (web + native via unified API)
- **Recording**: `Camera.recordAsync()` (native) and `MediaRecorder` (web)
- **Video Playback**: `Video` from `expo-video`
- **Upload Pickers**: `expo-image-picker` (gallery video) and `expo-document-picker` (Files app)
- **Pose Overlay**: `Svg` / `react-native-svg` layer driven by MediaPipe Pose Landmarker
- **Keep Awake**: `useKeepAwake` from `expo-keep-awake` during active recording/analysis
- **Action Sheet (Native UX)**: `ActionSheetIOS` (iOS) or `@expo/react-native-action-sheet` cross-platform
- **Primary Record Button**: `Button size="$6" backgroundColor="$red9" borderRadius="$12"` (80x80px)
- **Secondary Action Buttons**: `Button size="$4"` (60x60px touch targets)
- **Zoom Controls**: `XStack gap="$2"` with `Button size="$3" variant={active}` for each zoom level
- **Bottom Navigation**: `XStack` with `Button flex={1}` for each tab

### Responsive Breakpoints & Mobile-First Design
```typescript
// Mobile-First Responsive Implementation
const CameraScreen = () => {
  const media = useMedia()
  const insets = useSafeAreaInsets()
  
  return (
    <YStack 
      flex={1} 
      paddingTop={insets.top}
      paddingBottom={insets.bottom}
      backgroundColor="$background"
    >
      {/* Header - Mobile optimized */}
      <XStack
        height={44} // Minimum touch target
        $xs={{ height: 44 }}
        $sm={{ height: 56 }}
        $md={{ height: 64 }}
        paddingHorizontal="$3"
        $sm={{ paddingHorizontal: "$4" }}
        alignItems="center"
      >
        {/* Touch-optimized buttons */}
        <Button
          size={44} // Always 44px minimum
          chromeless
          onPress={onMenuPress}
        />
      </XStack>
      
      {/* Camera Controls - Responsive sizing */}
      <YStack
        position="absolute"
        bottom={media.xs ? 100 : 120}
        alignSelf="center"
      >
        {/* Record button - Mobile optimized */}
        <Button
          size={media.xs ? 80 : 100}
          borderRadius="$12"
          backgroundColor="$red9"
          pressStyle={{ scale: 0.95 }}
        />
      </YStack>
    </YStack>
  )
}
```

**Breakpoint Strategy**:
- **Mobile (xs: 0-428px)**: Default wireframe layout, 44px touch targets
- **Large Mobile (sm: 429-768px)**: Slightly larger controls, more spacing
- **Tablet (md: 769px+)**: Side-by-side layouts possible, larger hit areas
- **Desktop (lg+)**: Keyboard shortcuts, hover states, larger preview

**Touch Target Validation**:
- All buttons ≥ 44px × 44px (verified in wireframe)
- Controls positioned in thumb-friendly zones
- Sufficient spacing between adjacent controls (minimum 8px gaps)

### Interactive Elements
- **Touch Targets**: All buttons meet 44px minimum (verified in wireframe)
- **Gestures**: 
  - Pan for camera movement
  - Pinch-to-zoom alternative to discrete zoom buttons
  - Swipe gestures for tab navigation
  - Pull-to-refresh not applicable
- **Feedback**:
  - Visual: Button press states, recording pulse animation
  - Haptic: Record button tap, important state changes
  - Audio: Record start/stop sounds

### Content Types
- **Text Hierarchy**: Screen title (H2), timer (monospace), tab labels (caption)
- **Icons**: Navigation icons, camera controls, status indicators
- **Real-time Data**: Timer display, pose skeleton coordinates, camera feed
- **Status Indicators**: Recording state, network status, battery level awareness

### Navigation Patterns
- **Tab Navigation**: Bottom tabs with active state highlighting
- **Modal Overlays**: Camera settings sheet, permission prompts
- **Stack Navigation**: Record screen in tab stack
- **Side Sheet**: Hamburger menu opens side drawer with video history

## Technical Requirements Phase

### Data Requirements (TRD Cross-Reference)
- **Real-time**: 
  - Camera stream processing
  - Pose detection coordinates
  - Recording timer updates
- **Storage**:
  - Temporary video files during recording
  - Upload to Supabase Storage `raw` bucket
  - Pose data capture for analysis
- **State Management**:
  - Recording status (idle/recording/paused)
  - Camera settings (zoom, orientation)
  - Upload progress
  - Permission status

### State Management Strategy
- **Global State (Zustand)**:
  - `mediaStore`: recording state, camera permissions, upload progress
  - `analysisStore`: current job status, progress tracking
- **Local State**:
  - Camera preview dimensions
  - Pose overlay coordinates
  - UI animation states
- **Server State (TanStack Query)**:
  - Upload signed URL generation
  - Analysis job creation

### Platform Considerations
- **Native (Expo + React Native New Architecture)**:
  - **Camera Stack**: `react-native-vision-camera` v4+ (primary) with `expo-camera` fallback
  - **Pose Engine**: `react-native-fast-tflite` v1.6.1 + **MoveNet Lightning** model (replacing MediaPipe for 3-5x faster performance)
  - **Overlay Rendering**: `react-native-skia` for GPU-accelerated pose landmark rendering
  - **Video Recording**: VisionCamera's native recording capabilities with configurable quality presets
  - **Threading**: `react-native-worklets-core` for native-thread pose processing
  - **Playback**: `react-native-video` v6+ with synchronized pose overlay
  - **Upload Sources**: `expo-image-picker` (gallery) and `expo-document-picker` (files)
  - **Keep Awake**: `expo-keep-awake` during capture/analysis
  - **Action Sheet**: `@expo/react-native-action-sheet` for native selection UX
  - **State Management**: Enhanced Zustand stores (`useCameraStore`, `usePoseStore`, `usePerformanceStore`)
  - **Performance Monitoring**: Native thermal state monitoring and adaptive quality management
- **Web (Next.js + Progressive Web App)**:
  - **Camera Access**: Enhanced `getUserMedia()` with `ImageCapture` API for better frame control
  - **Pose Engine**: TensorFlow.js with **MoveNet Lightning** (same model as native) + WebGPU backend
  - **Threading**: Web Workers with `OffscreenCanvas` for native-like background processing
  - **Recording**: `MediaRecorder` API with VP9/WebM format for optimal compression
  - **Playback**: HTML5 `<video>` with WebGL-accelerated Canvas overlay
  - **Upload Sources**: `expo-image-picker` and `expo-document-picker`
  - **State Management**: Shared Zustand stores (identical to native)
  - **Performance**: WebGPU acceleration with WebGL fallback, service worker model caching
  - **PWA Features**: Background sync, offline model loading

### Performance Needs (TRD Compliance + Pipeline Optimizations)
- **Camera Stream**: 30fps minimum, 720p default resolution (adaptive: 15-30fps based on thermal state)
- **Pose Detection**: Real-time processing without blocking UI (3-5x faster with MoveNet vs MediaPipe)
- **Recording**: Efficient video encoding with configurable quality presets and thermal management
- **Upload**: Background processing with progress feedback and network retry logic
- **Memory**: Cleanup camera resources on unmount, compressed pose data storage (50MB buffer max)
- **Analysis Pipeline**: < 10 seconds median processing time (TRD requirement)
- **App Launch**: < 3 seconds to camera ready state (TRD requirement)
- **Upload Success**: p95 ≥ 99% on 3G+ networks for 60s clips (TRD requirement)
- **Progress Updates**: At least every 500ms during upload (TRD requirement)
- **Cross-Platform Performance**:
  - **Native**: 30-60fps with GPU acceleration, 40-60% battery savings through adaptive quality
  - **Web**: 30-45fps mobile web, 50+ fps desktop with WebGPU, intelligent frame skipping
  - **Thermal Management**: Dynamic quality adjustment (normal/fair/serious/critical states)
  - **Memory Optimization**: Compressed pose data (220 bytes/frame), circular buffers, efficient cleanup

Additional considerations:
- **Thermal State Monitoring**: Dynamic quality adjustment prevents device overheating
- **Adaptive Frame Processing**: Skip frames intelligently when performance degrades (native: every 3rd frame on serious thermal state)
- **GPU Acceleration**: WebGPU/WebGL for TensorFlow.js, GPU delegates for TensorFlow Lite
- **Memory Management**: Circular pose data buffers, automatic cleanup, compressed storage format
- **Cross-Platform Model Consistency**: Same MoveNet Lightning model across native and web platforms
- **Service Worker Caching**: Pre-load models for offline capability (web)
- **Battery Optimization**: Smart frame rate reduction and processing throttling based on battery level
- **Threading Strategy**: Native worklets (iOS/Android) and Web Workers (web) for background processing

### Security Requirements (TRD Compliance)
- **Row Level Security**: All database access restricted to authenticated users
- **Signed URLs**: Short-lived (5min TTL) for upload/download operations  
- **PII Protection**: No sensitive data in logs, video metadata scrubbing
- **Upload Validation**: File format, size, and duration limits enforced
- **Auth Integration**: Supabase JWT token validation on all requests

### Accessibility Requirements
- **Screen Reader**: 
  - Camera preview announced as "Camera view"
  - Recording status announced
  - Button labels with context
- **Keyboard Navigation**: Tab order for web version
- **High Contrast**: Ensure control visibility over video
- **Voice Control**: "Start recording", "Stop recording" commands

## Component Architecture Phase

### Expo & React Native Library Mapping
```typescript
// Core APIs used by this feature - Optimized Stack
import { Camera, CameraType, useCameraPermissions } from 'expo-camera'
import { useFrameProcessor } from 'react-native-vision-camera' // Primary camera
import { useTensorflowModel } from 'react-native-fast-tflite' // Pose detection
import { Video } from 'react-native-video' // Playback
import { useKeepAwake } from 'expo-keep-awake'
import * as ImagePicker from 'expo-image-picker'
import * as DocumentPicker from 'expo-document-picker'
import { useActionSheet } from '@expo/react-native-action-sheet'
import { runOnJS, runOnWorklet } from 'react-native-worklets-core' // Native threading

// Web APIs used by this feature
import * as tf from '@tensorflow/tfjs'
import '@tensorflow/tfjs-backend-webgpu'
import '@tensorflow/tfjs-backend-webgl'
import * as poseDetection from '@tensorflow-models/pose-detection'

// Shared state management
import { useCameraStore } from '../stores/cameraStore'
import { usePoseStore } from '../stores/poseStore'
import { usePerformanceStore } from '../stores/performanceStore'
```

- **Permissions**: `useCameraPermissions()` from `expo-camera`
- **Preview/Record**: `react-native-vision-camera` with `useFrameProcessor` (native); enhanced `getUserMedia` + `ImageCapture` (web)
- **Playback**: `react-native-video` v6+ (native); HTML5 `<video>` with WebGL overlay (web)
- **Upload Source**: `expo-image-picker` (gallery) or `expo-document-picker` (files)
- **Keep Awake**: `useKeepAwake()` during capture/analysis with thermal monitoring
- **Action Sheet**: `useActionSheet()` for native selection UI (Upload vs Record)
- **Pose Detection**: MoveNet Lightning via TensorFlow Lite (native) or TensorFlow.js (web) - same model across platforms
- **Threading**: `react-native-worklets-core` worklets (native); Web Workers + OffscreenCanvas (web)
- **State Management**: Enhanced Zustand stores with performance monitoring and thermal state tracking

```typescript
// Permissions + keep awake
const CameraRecordingScreen = () => {
  const [permission, requestPermission] = useCameraPermissions()
  useKeepAwake()
  // render <Camera /> when permission?.granted
}
```

```typescript
// Native action sheet for upload source
const { showActionSheetWithOptions } = useActionSheet()

const onUploadPress = () => {
  showActionSheetWithOptions(
    { options: ['Pick from Gallery', 'Pick from Files', 'Cancel'], cancelButtonIndex: 2 },
    async (index) => {
      if (index === 0) {
        await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'videos' })
      } else if (index === 1) {
        await DocumentPicker.getDocumentAsync({ type: 'video/*', multiple: false })
      }
    },
  )
}
```

```typescript
// MediaPipe Pose (web)
// Initialize PoseLandmarker with WASM assets and feed results into SVG overlay
```

### Component Hierarchy
```typescript
CameraRecordingScreen
├── CameraHeader
│   ├── NavigationButton (Menu/Back)
│   ├── ScreenTitle / RecordingTimer
│   └── NotificationButton (with badge)
├── CameraContainer
│   ├── CameraPreview (platform-specific)
│   ├── PoseOverlay
│   │   ├── SkeletonNodes
│   │   └── SkeletonConnections
│   └── CameraControls (conditional rendering)
│       ├── IdleControls
│       │   ├── UploadButton
│       │   ├── RecordButton
│       │   └── CameraSwapButton
│       └── RecordingControls
│           ├── CameraSettingsButton
│           ├── ZoomControls
│           ├── PauseStopButton
│           └── CameraSwapButton (disabled while recording)
└── BottomNavigation
    ├── CoachTab
    ├── RecordTab (active)
    └── InsightsTab
```

### Props Interfaces
```typescript
interface CameraRecordingScreenProps {
  // Navigation
  onNavigateBack: () => void
  onOpenSideSheet: () => void
  onTabChange: (tab: 'coach' | 'record' | 'insights') => void
  
  // Camera state
  cameraPermission: PermissionStatus
  recordingState: 'idle' | 'recording' | 'paused'
  recordingDuration: number
  
  // Camera controls
  cameraType: 'front' | 'back'
  zoomLevel: 1 | 2 | 3
  onCameraSwap: () => void
  onZoomChange: (level: 1 | 2 | 3) => void
  
  // Recording actions
  onStartRecording: () => void
  onPauseRecording: () => void
  onStopRecording: () => void
  onUploadVideo: () => void
  
  // Pose detection
  poseData: PoseKeypoints[]
  onPoseUpdate: (pose: PoseKeypoints[]) => void
}

interface PoseOverlayProps {
  keypoints: PoseKeypoints[]
  canvasSize: { width: number; height: number }
  confidenceThreshold: number
}

interface RecordingControlsProps {
  state: 'idle' | 'recording' | 'paused'
  duration: number
  zoomLevel: 1 | 2 | 3
  canSwapCamera: boolean
  onRecord: () => void
  onPause: () => void
  onStop: () => void
  onUpload: () => void
  onCameraSwap: () => void
  onZoomChange: (level: 1 | 2 | 3) => void
  onSettingsOpen: () => void
}
```

### Styling Strategy
```typescript
// Theme tokens for camera UI
export const cameraTheme = {
  colors: {
    recordingRed: '$red9',
    controlOverlay: 'rgba(0,0,0,0.3)',
    poseNode: '$blue8',
    poseConnection: '$blue6'
  },
  radii: {
    recordButton: '$12', // 80x80 button
    controlButton: '$8'   // 60x60 button
  },
  sizes: {
    recordButton: 80,
    controlButton: 60,
    minTouchTarget: 44
  }
}
```

### Testing Strategy (Comprehensive Coverage)
```typescript
// Unit Tests (packages/app/features/camera-recording/)
- PoseOverlay coordinate mapping and rendering
- Timer formatting and state transitions
- Camera permission handling and error states
- Recording state machine (idle/recording/paused/stopped)
- Upload validation (format, duration, size limits)
- Security validation (signed URL generation)

// Integration Tests
- Camera initialization flow with permissions
- Record → Pause → Resume → Stop flow
- Upload video selection and progress tracking
- Background upload with network retry logic
- Zoom level changes during recording
- Cross-platform camera API integration

// Performance Tests
- Camera startup time < 2s
- Recording initiation < 500ms
- Pose overlay rendering at 30fps
- Memory usage during extended recording
- Upload speed on various network conditions

// Security Tests  
- RLS policy validation for user data isolation
- Signed URL expiration and access control
- Video metadata scrubbing verification
- Auth token validation on API calls

// Accessibility Tests
- Screen reader navigation and announcements
- Voice control command recognition
- High contrast mode visibility
- Touch target size validation (≥44px)

// E2E Tests (Cross-Platform)
- Complete recording workflow (idle → record → analyze)
- Permission denial and recovery flow
- Network interruption during upload with retry
- Cross-platform parity (iOS/Android/Web rendering)
- Upload large files (60s videos) on slow networks
- Simultaneous recording and pose detection
```

### Library-specific Testing Notes

- Mock `expo-camera`, `expo-video`, `expo-image-picker`, `expo-document-picker`, and `expo-keep-awake` in unit tests
- Web: stub `MediaRecorder` and MediaPipe (`@mediapipe/tasks-vision`) with deterministic outputs
- Native: stub ActionSheet via `@expo/react-native-action-sheet` test utilities

## User Story Compliance Validation

### US-RU-02: Handle permissions gracefully ✅
- **Wireframe Coverage**: Header space for permission prompts
- **Implementation**: Modal overlay for permission requests
- **Missing Elements**: None identified

### US-RU-06a: Recording states — Idle controls ✅
- **Wireframe Coverage**: All idle controls visible (Record, Upload, Camera Swap)
- **Implementation**: Conditional rendering based on recording state
- **Missing Elements**: None identified

### US-RU-06b: Recording states — Recording/Paused controls ✅
- **Wireframe Coverage**: Timer, Pause/Stop, Camera Settings, Zoom levels shown
- **Implementation**: State-based control switching
- **Missing Elements**: None identified

### US-RU-08: Live motion capture overlay ✅
- **Wireframe Coverage**: Pose skeleton clearly shown over camera preview
- **Implementation**: SVG overlay with real-time coordinate updates
- **Missing Elements**: None identified

### US-RU-09a/09b: Camera controls — swap and zoom ✅
- **Wireframe Coverage**: Camera swap button in both states, zoom controls during recording
- **Implementation**: Camera API integration with state management
- **Missing Elements**: None identified

### US-RU-10: Bottom navigation ✅
- **Wireframe Coverage**: Three-tab navigation with Record tab active
- **Implementation**: Expo Router tab navigation
- **Missing Elements**: None identified

### US-RU-11: Notifications with badge ✅
- **Wireframe Coverage**: Notification icon with badge shown in header
- **Implementation**: Absolute positioned badge over button
- **Missing Elements**: None identified

### US-RU-12: Side-sheet with previous videos ✅
- **Wireframe Coverage**: Hamburger menu for side sheet access
- **Implementation**: Drawer navigation pattern
- **Missing Elements**: Side sheet content not shown in wireframe (expected)

### US-RU-01: Record a video up to 60 seconds ✅
- **Wireframe Coverage**: Recording timer displayed, record button initiates recording
- **Implementation**: Timer component with 60s hard limit, state machine for record/pause/stop
- **Missing Elements**: None identified

### US-RU-03: Upload an existing video (MP4/MOV) ✅
- **Wireframe Coverage**: Upload button clearly shown in idle state
- **Implementation**: File picker integration, format validation, duration checking
- **Missing Elements**: Upload progress UI not shown in wireframe (handled in separate state)

### US-RU-04: Background upload with progress and retry ✅
- **Wireframe Coverage**: Upload functionality implied by upload button
- **Implementation**: Background upload service with progress tracking and retry logic
- **Missing Elements**: Progress UI requires separate state/screen not in wireframe

### US-RU-05: Secure upload to Supabase Storage (raw) ✅
- **Wireframe Coverage**: Upload functionality supports secure backend integration
- **Implementation**: Signed URL generation and secure upload to Supabase Storage
- **Missing Elements**: None identified (backend integration)

### US-RU-07: Confirm navigation away while recording ✅
- **Wireframe Coverage**: Back button visible in recording state
- **Implementation**: Navigation confirmation dialog when recording is active
- **Missing Elements**: Dialog not shown in wireframe (modal overlay behavior)

### US-RU-13: Video playback with live processing ✅
- **Wireframe Coverage**: Post-recording state implied after stop button
- **Implementation**: Video playback with analysis progress overlay
- **Missing Elements**: Post-recording playback state not shown in wireframes (separate flow)

## Cross-Platform Validation Phase

### Web Implementation
- **Camera Access**: `expo-camera` (web) using `getUserMedia` under the hood; `useCameraPermissions`
- **Recording**: `MediaRecorder` API with format constraints
- **Playback**: `expo-video`
- **Pose Detection**: MediaPipe Pose Landmarker via `@mediapipe/tasks-vision`
- **Upload Source**: `expo-image-picker` and `expo-document-picker`
- **Upload**: Direct to Supabase Storage with progress tracking

### Native Implementation
- **Camera Access**: `expo-camera` with `useCameraPermissions`
- **Recording**: `Camera.recordAsync` with quality presets
- **Playback**: `expo-video`
- **Keep Awake**: `expo-keep-awake` during capture/analysis
- **Pose Detection**: MediaPipe (e.g., native Mediapipe bindings)
- **Upload Source**: `expo-image-picker` / `expo-document-picker` via native Action Sheet
- **Upload**: Background upload with network retry logic

### Shared Logic (packages/app/features) - Unified Architecture
- **Camera permission management**: Identical hooks and state management
- **Recording state machine**: Shared Zustand stores with cross-platform synchronization
- **Upload progress tracking**: Unified progress handling with retry logic
- **Pose data processing**: Same MoveNet Lightning model and data compression format
- **Analysis job creation**: Shared API integration and error handling
- **Performance monitoring**: Unified metrics collection and adaptive quality management
- **Data compression**: Shared `PoseDataBuffer` class with identical JSON export format
- **State management**: Identical Zustand store structure and actions across platforms

### Performance Considerations - Pipeline Optimizations
- **Bundle Size**: Lazy load TensorFlow.js models with service worker caching (web)
- **Memory Usage**: Compressed pose data storage (220 bytes/frame), circular buffers, automatic cleanup
- **Battery Impact**: Adaptive quality management with thermal state monitoring (40-60% savings)
- **Network Usage**: Efficient video encoding with VP9/WebM (web) and configurable presets (native)
- **GPU Acceleration**: WebGPU/WebGL backends (web), GPU delegates (native)
- **Frame Processing**: Intelligent frame skipping based on performance metrics
- **Model Optimization**: MoveNet Lightning for 3-5x faster inference vs MediaPipe
- **Threading**: Native worklets (iOS/Android) and Web Workers (web) for background processing

## Quality Gates

### Visual Parity ✅
- **Layout**: Identical component positioning across platforms
- **Typography**: Consistent font weights and sizes
- **Colors**: Shared theme tokens ensure brand consistency
- **Animations**: Platform-appropriate transitions

### Interaction Parity ✅
- **Touch Targets**: 44px minimum on all platforms
- **Gestures**: Pan, pinch, tap behaviors consistent
- **Feedback**: Visual, haptic, and audio responses aligned

### Accessibility Compliance
- **Screen Reader**: All interactive elements properly labeled
- **Keyboard Navigation**: Web version supports tab navigation
- **Contrast**: UI elements visible against video background
- **Voice Commands**: Integration ready for accessibility features

### Performance Benchmarks - Pipeline Targets
- **Camera Initialization**: < 2 seconds (VisionCamera fast startup)
- **Recording Start**: < 500ms from tap to recording
- **Pose Detection**: 30-60fps native, 30-45fps web mobile, 50+ fps web desktop
- **Pose Overlay**: 30fps rendering without camera lag (Skia/WebGL acceleration)
- **Upload Progress**: Updates every 100ms with accurate percentage
- **Model Loading**: < 3 seconds with service worker caching (web)
- **Memory Usage**: < 100MB during recording with compressed pose data
- **Battery Impact**: 40-60% reduction through adaptive quality management
- **Thermal Performance**: Maintains normal thermal state during extended recording

## Documentation Requirements

### Storybook Stories
- [ ] CameraRecordingScreen (all states)
- [ ] PoseOverlay (various pose configurations)
- [ ] RecordingControls (idle/recording/paused)
- [ ] CameraHeader (title/timer variations)

### API Documentation
- [ ] Camera permission hooks
- [ ] Recording state management
- [ ] Pose detection service
- [ ] Upload service endpoints

### Testing Coverage
- [ ] Unit tests for all state transitions
- [ ] Integration tests for camera workflows
- [ ] E2E tests for complete user journeys
- [ ] Performance tests for resource usage

### Accessibility Notes
- [ ] Screen reader test results
- [ ] Keyboard navigation verification
- [ ] High contrast mode testing
- [ ] Voice control compatibility

## Implementation Priority

### Phase 1: Core Camera Functionality
1. **VisionCamera Integration**: Replace expo-camera with react-native-vision-camera v4+
2. **Basic Recording**: Implement start/stop with native recording capabilities
3. **Timer Display**: Real-time recording duration with state management
4. **Permission Handling**: Cross-platform camera and storage permissions

### Phase 2: Enhanced Controls & State Management
1. **Adaptive Quality System**: Thermal monitoring and dynamic quality adjustment
2. **Zoom & Camera Controls**: Multi-level zoom with camera swap functionality
3. **Recording States**: Pause/resume with proper state transitions
4. **Enhanced Zustand Stores**: Performance monitoring and thermal state tracking

### Phase 3: AI Integration & Pose Detection
1. **MoveNet Lightning Setup**: TensorFlow Lite (native) and TensorFlow.js (web)
2. **Pose Overlay Rendering**: Skia (native) and WebGL Canvas (web) for landmarks
3. **Real-time Processing**: Worklet/Web Worker threading for smooth performance
4. **Data Compression**: Implement `PoseDataBuffer` with timestamp synchronization

### Phase 4: Cross-Platform Optimization & Polish
1. **Performance Optimization**: GPU acceleration, frame skipping, memory management
2. **Unified Architecture**: Shared components and state management across platforms
3. **PWA Features**: Service worker caching, offline model loading (web)
4. **Accessibility & Testing**: Screen reader support, comprehensive test coverage

---

**Analysis Completed**: 2025-01-19
**Cross-Referenced**: PRD, TRD, User Stories (01a_camera.md, 01b_recording.md), Pipeline Docs (native_pipeline.md, web_pipeline.md)
**Validation**: All wireframe elements mapped, all 15 user stories covered
**Coverage**: 100% user story compliance, TRD performance/security alignment verified
**Technical Architecture**: Unified MoveNet Lightning across platforms, adaptive quality management, native threading
**Performance Targets**: 30-60fps native, 30-50fps web with GPU acceleration and 40-60% battery optimization
**Mobile-First**: Responsive breakpoints, touch targets, safe area handling, thermal-aware processing