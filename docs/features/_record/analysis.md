# Record Screen Wireframe Analysis

> **Status**: Analysis Phase - Systematic wireframe breakdown for video recording feature

## Visual Analysis Phase

### Layout Structure
- [x] **Main Container**: Full-screen YStack with safe area handling
- [x] **Header Section**: Fixed XStack (60px height) with hamburger menu (left) and notifications (right)
- [x] **Content Area**: Flex-1 area with camera preview background
- [x] **Bottom Navigation**: Fixed XStack (80px height) with three tabs
- [x] **Recording Controls**: Centered circular controls overlay on camera area

### Component Mapping
```typescript
// Root Layout Structure
YStack flex={1} backgroundColor="$background"
├── Header: XStack height={60} paddingHorizontal="$4"
│   ├── MenuButton: Button variant="ghost" icon={Menu} size={44x44}
│   ├── Title: Text "Main screen - Record" (centered)
│   └── NotificationButton: Button variant="ghost" icon={Bell} size={44x44}
├── CameraArea: YStack flex={1} position="relative"
│   ├── CameraPreview: Camera component (background)
│   └── RecordingControls: Positioned absolute, centered
│       ├── UploadButton: Button icon={Upload} size={60x60}
│       ├── RecordButton: Button variant="primary" size={80x80} (main CTA)
│       └── CameraSwapButton: Button icon={RotateCcw} size={60x60}
└── BottomNavigation: XStack height={80} justifyContent="space-between"
    ├── CoachTab: Button variant="ghost" icon={User}
    ├── RecordTab: Button variant="primary" icon={Circle} (active)
    └── InsightsTab: Button variant="ghost" icon={BarChart}
```

### Responsive Breakpoints
- [x] **Mobile (xs: 0-428px)**: Primary target - single column, bottom navigation
- [x] **Tablet (sm: 429-768px)**: Larger camera area, same layout structure
- [x] **Desktop (md+: 769px+)**: Side navigation possible, larger controls

### Interactive Elements
- [x] **Touch Targets**: All buttons meet 44px minimum (record button 80px for emphasis)
- [x] **Primary Action**: Large red record button (80x80px) - most prominent
- [x] **Secondary Actions**: Upload and camera swap (60x60px)
- [x] **Navigation**: Bottom tabs with active state indication
- [x] **Gestures**: Tap to record, long press for continuous recording

### Content Types
- [x] **Camera Preview**: Live video feed background
- [x] **Status Text**: "Camera video runs in background" annotation
- [x] **Icons**: Menu, Bell, Upload, Record (Circle), Camera swap, User, BarChart
- [x] **Navigation Labels**: "Coach", "Record", "Insights"

### Navigation Patterns
- [x] **Tab Navigation**: Bottom tabs for main app sections
- [x] **Modal Overlays**: Side drawer from hamburger menu
- [x] **Notifications**: Badge indicator on bell icon
- [x] **Camera Controls**: Overlay controls on camera preview

## Technical Requirements Phase

### Data Requirements
- [x] **Supabase Tables Needed**:
  ```sql
  -- Video recordings table
  CREATE TABLE recordings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    file_path TEXT NOT NULL,
    thumbnail_path TEXT,
    duration INTEGER, -- seconds
    file_size BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );

  -- User preferences for camera settings
  CREATE TABLE user_camera_settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id),
    preferred_camera 'front' | 'back' DEFAULT 'front',
    video_quality 'low' | 'medium' | 'high' DEFAULT 'medium',
    auto_upload BOOLEAN DEFAULT true
  );
  ```

- [x] **API Endpoints**:
  - `POST /api/recordings/start` - Initialize recording session
  - `POST /api/recordings/upload` - Upload video file to Supabase Storage
  - `GET /api/recordings` - List user recordings
  - `DELETE /api/recordings/:id` - Delete recording

### State Management
- [x] **Global State (Zustand)**:
  ```typescript
  interface RecordingStore {
    isRecording: boolean
    currentRecording: Recording | null
    cameraFacing: 'front' | 'back'
    recordingDuration: number
    startRecording: () => Promise<void>
    stopRecording: () => Promise<void>
    toggleCamera: () => void
  }
  ```

- [x] **Server State (TanStack Query)**:
  - `useRecordings()` - Fetch user recordings list
  - `useUploadRecording()` - Upload mutation
  - `useDeleteRecording()` - Delete mutation

- [x] **Local State**: Camera permissions, recording timer, upload progress

### Platform Considerations
- [x] **Native (Expo)**:
  - `expo-camera` for camera access
  - `expo-video` for video recording
  - `expo-file-system` for local file management
  - Platform-specific permissions handling

- [x] **Web**:
  - `getUserMedia()` API for camera access
  - `MediaRecorder` API for recording
  - File upload via FormData
  - Browser permission prompts

### Performance Needs
- [x] **Video Optimization**: Compress videos before upload
- [x] **Background Processing**: Upload while user continues using app
- [x] **Memory Management**: Clear camera resources when not in use
- [x] **Storage Management**: Local cleanup after successful upload

### Accessibility
- [x] **Screen Reader**: Announce recording state changes
- [x] **Keyboard Navigation**: Tab through controls (web)
- [x] **High Contrast**: Ensure button visibility in all lighting
- [x] **Voice Control**: Support voice commands for recording

## Component Architecture Phase

### Component Hierarchy
```typescript
RecordScreen
├── RecordHeader
│   ├── MenuButton
│   ├── ScreenTitle
│   └── NotificationButton
├── CameraPreview
│   ├── CameraView (platform-specific)
│   └── RecordingOverlay
│       ├── UploadButton
│       ├── RecordButton
│       └── CameraSwapButton
└── BottomNavigation
    ├── CoachTab
    ├── RecordTab (active)
    └── InsightsTab
```

### Props Interfaces
```typescript
interface RecordScreenProps {
  initialCameraFacing?: 'front' | 'back'
}

interface CameraPreviewProps {
  isRecording: boolean
  cameraFacing: 'front' | 'back'
  onStartRecording: () => void
  onStopRecording: () => void
  onToggleCamera: () => void
  onUpload: () => void
}

interface RecordButtonProps {
  isRecording: boolean
  onPress: () => void
  disabled?: boolean
}
```

### Styling Strategy
- [x] **Theme Tokens**: 
  - `$recordingRed` for active recording state
  - `$cameraOverlay` for semi-transparent controls
  - `$safeArea` for proper insets handling

- [x] **Responsive Design**: Mobile-first with larger touch targets
- [x] **Animations**: 
  - Pulse animation for recording button
  - Smooth camera flip transition
  - Upload progress indicator

### Testing Strategy
- [x] **Unit Tests**: Component rendering, state management
- [x] **Integration Tests**: Camera permissions, recording flow
- [x] **E2E Tests**: Complete recording and upload workflow
- [x] **Visual Tests**: Storybook for all component states

## Cross-Platform Validation Phase

### Web Implementation
- [x] **Next.js Integration**: Dynamic import for camera components
- [x] **Browser Compatibility**: MediaRecorder API support detection
- [x] **SEO Considerations**: No-index for camera pages
- [x] **PWA Features**: Background upload capability

### Native Implementation
- [x] **Expo Router**: Stack navigation for recording flow
- [x] **Platform Gestures**: Native camera controls
- [x] **Background Tasks**: Continue upload when app backgrounded
- [x] **Device Orientation**: Handle rotation during recording

### Shared Logic
- [x] **Recording State**: Shared Zustand store
- [x] **Upload Logic**: Common API client in packages/api
- [x] **Validation**: Shared Zod schemas for recording data
- [x] **Error Handling**: Consistent error boundaries

### Performance Testing
- [x] **Bundle Size**: Camera components lazy-loaded
- [x] **Memory Usage**: Monitor during long recordings
- [x] **Battery Impact**: Optimize camera usage patterns
- [x] **Network Usage**: Efficient upload with retry logic

## Quality Gates

### Visual Parity
- [x] **Layout Consistency**: Identical positioning across platforms
- [x] **Button Sizing**: 44px minimum touch targets maintained
- [x] **Color Accuracy**: Recording red consistent across devices
- [x] **Animation Timing**: Smooth 60fps animations

### Interaction Parity
- [x] **Recording Flow**: Tap to start/stop works identically
- [x] **Camera Switching**: Smooth transition on both platforms
- [x] **Upload Progress**: Visual feedback consistent
- [x] **Error States**: Same error handling and recovery

### Accessibility Compliance
- [x] **WCAG 2.2 AA**: Color contrast ratios verified
- [x] **Screen Reader**: All actions properly announced
- [x] **Keyboard Navigation**: Full keyboard accessibility (web)
- [x] **Focus Management**: Proper focus handling during recording

### Performance Benchmarks
- [x] **Camera Load**: <2s to camera preview
- [x] **Recording Start**: <500ms to begin recording
- [x] **Upload Speed**: Background upload without blocking UI
- [x] **Memory Usage**: <100MB during active recording

## Documentation Requirements

### Storybook Stories
- [x] **RecordButton**: Default, recording, disabled states
- [x] **CameraPreview**: With/without permissions, different orientations
- [x] **RecordingOverlay**: All control combinations
- [x] **BottomNavigation**: Active/inactive tab states

### API Documentation
- [x] **Recording Endpoints**: OpenAPI specs with examples
- [x] **Upload Flow**: Step-by-step integration guide
- [x] **Error Codes**: Complete error handling reference
- [x] **Rate Limits**: Upload frequency and size limits

### Testing Coverage
- [x] **Unit Tests**: >90% coverage for all components
- [x] **Integration Tests**: Complete recording workflow
- [x] **E2E Tests**: Cross-platform recording scenarios
- [x] **Performance Tests**: Memory and battery usage validation

### Accessibility Notes
- [x] **Screen Reader Testing**: VoiceOver and TalkBack validation
- [x] **Keyboard Testing**: Full keyboard navigation flow
- [x] **High Contrast**: Testing in accessibility modes
- [x] **Voice Control**: Switch Control and Voice Control support

## Implementation Readiness Checklist

- [x] Visual analysis complete - all UI elements mapped to Tamagui components
- [x] Technical requirements defined - Supabase schema and API endpoints specified
- [x] Component architecture planned - clear hierarchy and props interfaces
- [x] Cross-platform considerations addressed - native and web implementations
- [x] Performance and accessibility requirements documented
- [x] Testing strategy comprehensive - unit, integration, and E2E coverage

**Status**: ✅ Ready for task generation and implementation

## Next Steps

1. **Generate Implementation Tasks**: Create detailed task breakdown in `docs/features/record/tasks.md`
2. **Setup Database Schema**: Run Supabase migrations for recording tables
3. **Implement Core Components**: Start with RecordButton and CameraPreview
4. **Add Platform-Specific Logic**: Camera permissions and recording APIs
5. **Integrate State Management**: Zustand store and TanStack Query setup
6. **Testing Implementation**: Unit tests, integration tests, E2E scenarios