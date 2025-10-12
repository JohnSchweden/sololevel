# Current Sprint Tasks

## US-VF-01: Video Analysis State Management
Status: Completed
Priority: High
Dependencies: US-RU-01 (Video Recording), AI analysis pipeline

### User Story
As a developer, I want to use the existing centralized state management system for video analysis so that all components can share and synchronize video processing data.

### Requirements
- Centralized video analysis state management
- Real-time pose data streaming and storage
- Analysis progress tracking and status updates
- Error handling and retry mechanisms
- Cross-component state synchronization
- Performance optimization for large datasets

### Acceptance Criteria
- Given the existing videoAnalysisStore is used in a video analysis session
- When pose data is received from AI pipeline
- Then the state store updates with new pose data
- And all subscribed components receive updates
- And analysis progress is tracked and displayed
- And errors are handled gracefully with retry options
- And state persists across component unmounts/remounts

### Technical Notes
- **State Management**: Existing Zustand store (`videoAnalysisStore.ts`) provides centralized state management
- **AI Pipeline Integration**: Real-time pose data from MoveNet Lightning model processing
- **Data Flow**: Unified `PoseDetectionResult[]` format from VisionCamera (live) and react-native-video-processing (uploaded videos)
- **Database Integration**: Supabase Realtime subscriptions for analysis status updates
- **Performance**: Web Workers (web) and react-native-worklets-core (native) for background processing
- **Error Handling**: Discriminated union results with Zod validation and structured error codes
- **Persistence**: SQLite storage for pose data, AsyncStorage for user preferences
- **Cross-platform**: Unified state interface for Expo (native) and Expo Router (web) implementations
- **Real-time Sync**: WebSocket connections for live pose detection during recording

---

## US-VF-02: Video Player Component
Status: Completed
Priority: High
Dependencies: US-VF-01 (Video Analysis State Management)

### User Story
As a user, I want to use the existing video player that can display video content with overlay capabilities so I can see my recorded performance with AI analysis overlays.

### Requirements
- Video playback with overlay support
- Cross-platform video rendering (react-native-video/HTML5)
- Overlay positioning and z-index management
- Video loading states and error handling
- Performance optimization for smooth playback
- Accessibility support for video controls

### Acceptance Criteria
- Given a video file is provided to the existing VideoPlayer component
- When the video player loads
- Then the video plays smoothly at 60fps
- And overlay components can be positioned over the video
- And loading states are displayed during video preparation
- And errors are handled gracefully with user feedback
- And the player supports keyboard navigation (web) and touch gestures (native)

### Technical Notes
- **Video Rendering**: Existing `react-native-video` v6+ for native platforms, HTML5 `<video>` with frame control for web
- **Overlay System**: `react-native-skia` (native) and WebGL-accelerated Canvas (web) for pose landmarks
- **Performance**: Frame-perfect synchronization with high-resolution timers and requestAnimationFrame optimization
- **State Integration**: Subscribes to existing `videoAnalysisStore` for unified pose data and video metadata
- **Cross-platform**: Existing unified video player interface via `@my/ui/VideoPlayer` package with platform-specific implementations
- **Accessibility**: WCAG 2.2 AA compliance for web, RN accessibility roles/labels for native
- **Error Handling**: Graceful degradation with user-safe error messages and correlation IDs
- **Audio Integration**: Unified audio/video playback for TTS commentary with AAC/MP3 format support

---

## US-VF-03: Motion Capture Overlay Component
Status: Completed
Priority: High
Dependencies: US-VF-01 (Video Analysis State Management), US-VF-02 (Video Player Component)

### User Story
As a user, I want to use the existing motion capture overlay to see a skeletal representation of my movements overlaid on the video so I can understand how the AI is analyzing my posture and form.

### Requirements
- Real-time skeletal joint detection and visualization
- Dashed-line skeletal figure with joint circles
- Dynamic pose tracking throughout video playback
- Visual feedback for detected movements
- Overlay transparency and positioning
- Performance optimization for smooth tracking

### Acceptance Criteria
- Given the video is playing with AI analysis and the existing MotionCaptureOverlay is used
- When skeletal tracking is active
- Then I see a light gray dashed-line skeletal figure
- And joint positions are marked with circles
- And the skeleton updates in real-time with my movements
- And the overlay doesn't obstruct important video content
- And tracking performance is smooth without lag

### Technical Notes
- **Pose Detection**: MoveNet Lightning model (`movenet_lightning_int8.tflite`) via react-native-fast-tflite (native) and @tensorflow-models/pose-detection (web)
- **Visualization**: `react-native-skia` for native rendering, WebGL-accelerated Canvas with GPU transforms for web
- **Performance**: Native-threaded processing with react-native-worklets-core (native) and Web Workers with OffscreenCanvas (web)
- **Overlay Management**: Z-index layering with transparency controls and frame-perfect synchronization
- **Joint Mapping**: Standard MoveNet keypoint mapping (nose, eyes, shoulders, elbows, wrists, hips, knees, ankles)
- **State Integration**: Subscribes to existing `videoAnalysisStore` for unified `PoseDetectionResult[]` data
- **Cross-platform**: Platform-specific optimizations with unified pose data format
- **Component Location**: Existing `packages/ui/src/components/VideoAnalysis/MotionCaptureOverlay/`
- **Confidence Filtering**: Temporal smoothing and confidence thresholding for stable skeletal tracking

---

## US-VF-04: Feedback Bubble Component
Status: Completed
Priority: High
Dependencies: US-VF-01 (Video Analysis State Management), US-VF-02 (Video Player Component)

### User Story
As a user, I want to receive contextual feedback messages during video playback using the existing feedback system so I can understand what I'm doing well and what needs improvement.

### Requirements
- Contextual feedback messages based on video analysis
- Speech bubble-style UI for feedback display
- Real-time message updates during playback
- Positive reinforcement ("Nice grip!")
- Improvement suggestions ("Bend your knees a little bit and keep your back straight!")
- Message positioning and timing
- Feedback categorization and prioritization
- Static avatar icon display (V1)

### Acceptance Criteria
- Given the video is playing with the existing FeedbackBubbles component
- When the video have been analysed and first audio feedback have been created
- Then contextual feedback bubbles appear
- And positive feedback is shown for good form ("Nice grip!")
- And improvement suggestions are provided ("Bend your knees...")
- And messages are positioned to not obstruct video content
- And feedback updates in real-time as analysis progresses
- And a static avatar icon is displayed near the text bubble

### Technical Notes
- **AI Analysis**: Gemini 2.5 for comprehensive video analysis with movement pattern recognition
- **Feedback Engine**: LLM-based feedback generation with structured prompt engineering for key takeaways and next steps
- **UI Components**: Existing Tamagui speech bubble components with smooth animations and accessibility support
- **Message Queue**: Prioritized feedback system with real-time updates via Supabase Realtime
- **Positioning**: Smart positioning algorithm to avoid video content obstruction with responsive layout
- **Timing**: Synchronized feedback with video timeline using high-resolution timers
- **State Integration**: Subscribes to existing `videoAnalysisStore` for real-time feedback data from Edge Functions
- **Localization**: Multi-language support with structured feedback message templates
- **Accessibility**: Screen reader support with ARIA labels and WCAG 2.2 AA compliance
- **Component Location**: Existing `packages/ui/src/components/VideoAnalysis/FeedbackBubbles/`
- **Performance**: Virtualized message rendering for large feedback datasets

---

## US-VF-05: Video Title Component
Status: Completed
Priority: Low
Dependencies: US-VF-01 (Video Analysis State Management)

### User Story
As a user, I want my videos to have automatically generated titles based on their content using the existing title generation system so I can easily identify and organize my recordings.

### Requirements
- AI-powered video title generation
- Context-aware title creation based on detected activities
- Real-time title updates as analysis progresses
- Fallback to timestamp-based titles if analysis fails
- Title display in video player header
- Title editing capability for user customization

### Acceptance Criteria
- Given a video has been recorded and analysis begins with the existing VideoTitle component
- When the AI processes the video content
- Then a contextual title is generated (e.g., "Q3 Sales Presentation")
- And the title appears in the video player header
- And the title updates if better context is detected
- And I can edit the title if needed
- And a fallback title is provided if AI analysis fails

### Technical Notes
- **LLM Integration**: Gemini 2.5 for contextual title generation based on video content and pose analysis
- **Content Analysis**: Activity detection from pose data and video frames for meaningful title creation
- **Title Generation**: Structured prompt engineering with activity recognition and contextual understanding
- **Fallback System**: Timestamp-based titles with user customization options when AI analysis fails
- **State Integration**: Subscribes to existing `videoAnalysisStore` for real-time title updates from Edge Functions
- **Performance**: Async title generation via Edge Functions to avoid blocking video playback (< 10s total analysis time)
- **Caching**: Title caching in Supabase database with invalidation on re-analysis
- **Component Location**: Existing `packages/ui/src/components/VideoAnalysis/VideoTitle/`
- **Database Storage**: Titles stored in `analyses` table with RLS policies for user access control

---

## US-VF-06: Video Controls Component
Status: Completed
Priority: High
Dependencies: US-VF-01 (Video Analysis State Management), US-VF-02 (Video Player Component)

### User Story
As a user, I want to control the video playback with standard controls using the existing video controls overlay so I can play, pause, and navigate the video with an unobstructed view of the AI analysis.

### Requirements
- Video controls overlay with play/pause, progress bar, and fullscreen
- Auto-hide functionality after 3 seconds of inactivity
- Touch-to-show controls when hidden
- Smooth fade in/out animations
- Progress bar with current time display (0:01 / 3:21)
- Fullscreen toggle functionality
- Central controls for play, pause, rewind, and fast-forward

### Acceptance Criteria
- Given the video is playing with analysis overlay using the existing VideoControlsOverlay
- When the video starts playing
- Then video controls are visible for 3 seconds
- And controls automatically fade out after 3 seconds
- And I can tap the video to show controls again
- And controls include play/pause, progress bar, and fullscreen
- And progress shows current time and total duration
- And controls fade in/out smoothly
- When I tap the pause button, the video pauses and the button changes to a play icon
- When I tap the play button, the video resumes and the button changes to a pause icon

### Technical Notes
- **Control Overlay**: Existing Tamagui-based video control components with platform-specific optimizations
- **Auto-hide Logic**: 3-second timer with touch-to-show functionality and smooth fade animations
- **Touch Handling**: Gesture detection with react-native-gesture-handler for native, pointer events for web
- **Animations**: Smooth fade transitions using Tamagui animations with performance optimization
- **Progress Bar**: Custom progress component with current time/total duration display (MM:SS format)
- **Fullscreen**: Platform-specific fullscreen API implementation with orientation handling
- **State Integration**: Subscribes to existing `videoAnalysisStore` for unified player state management
- **UI Components**: Lucide React icons with consistent theming, existing `VideoControlsOverlay` component
- **Accessibility**: WCAG 2.2 AA compliance with keyboard navigation and screen reader support
- **Component Location**: Existing `packages/ui/src/components/VideoAnalysis/VideoControlsOverlay/`
- **Performance**: Optimized rendering to maintain 60fps playback during control interactions

---

## US-VF-11: Video Player Header Component
Status: Completed
Priority: High
Dependencies: US-VF-01 (Video Analysis State Management), US-VF-02 (Video Player Component), US-VF-06 (Video Controls Component)

### User Story
As a user, I want a consistent header in the video player that appears and disappears together with the video controls using the existing AppHeader component so I can easily access additional options without cluttering the screen.

### Requirements
- Header with title and menu button that appears with video controls
- Header auto-hides after 3 seconds along with video controls
- Header reappears when user taps to show video controls
- Menu button that triggers a fly-out menu
- Use the already existing AppHeader component in 'analysis' mode

### Acceptance Criteria
- Given the video controls are visible using the existing VideoControlsOverlay
- When the video starts playing
- Then the header is also visible with title and menu button
- And the header automatically hides after 3 seconds along with the video controls
- And tapping the video area shows both the header and video controls together
- And the menu button displays a fly-out menu when tapped
- And the header uses the existing AppHeader component in 'analysis' mode for consistency

### Technical Notes
- **Header Component**: Existing `AppHeader` component from `@my/ui/components/AppHeader/` reused in 'analysis' mode
- **Visibility Sync**: Header visibility is synchronized with video controls auto-hide/show behavior
- **Navigation**: Back navigation handled by screen-level navigation (Expo Router swipe back), not header button
- **Menu System**: Fly-out menu implementation using Tamagui overlay components, triggered by AppHeader's menu button
- **State Integration**: Subscribes to existing `videoAnalysisStore` for video title, menu state, and controls visibility
- **UI Consistency**: Maintains design consistency with other app screens using AppHeader
- **Accessibility**: WCAG 2.2 AA compliance with proper ARIA labels and keyboard navigation
- **Component Integration**: Header integrated into existing VideoControls component with shared visibility state
- **Cross-platform**: Unified header behavior for Expo (native) and Expo Router (web) with synchronized controls

---

## US-VF-07: Audio Commentary Component
Status: Completed
Priority: High
Dependencies: US-VF-01 (Video Analysis State Management), US-VF-02 (Video Player Component), US-VF-06 (Video Controls Component)

### User Story
As a user, I want narrated feedback so I can receive audio commentary synchronized with my video playback using the existing audio feedback system.

### Requirements
- Audio commentary playback synchronized with video
- Automatic video pause when audio feedback is available
- Audio playback controls (play/pause/seek)
- Automatic video resume after audio ends
- TTS-generated audio from AI feedback

### Acceptance Criteria
- Given an `audio_url` exists and the existing AudioFeedbackOverlay is used
- When I press Play I see the video playback
- And at the time of the available feedback the video playback is automatically paused without pause overlay
- And the audio streams with play/pause/seek controls
- Finally the video is resumed after audio stream ends

### Technical Notes
- **Audio Playback**: `react-native-video` v6+ for unified video/audio playback across platforms
- **Audio Fallback**: `react-native-sound` for dedicated audio-only files if needed
- **TTS Pipeline**: Gemini 2.0 TTS generation via Edge Functions with SSML markup support
- **Format Optimization**: Convert WAV output to AAC/MP3 format (75%+ file size reduction)
- **Storage**: Audio files stored in Supabase Storage `processed` bucket with signed URLs
- **State Integration**: Subscribes to existing `videoAnalysisStore` for audio data and timeline synchronization
- **UI Integration**: Audio controls seamlessly integrated into video overlay with unified interface
- **State Management**: Track audio playback state with video timeline sync and pause/resume coordination
- **Cross-platform**: AAC primary (iOS/Android), MP3 fallback (universal), OGG for web optimization
- **Component Location**: Existing `packages/ui/src/components/VideoAnalysis/AudioFeedbackOverlay/`
- **Performance**: Compressed formats reduce load times and memory consumption on mobile devices

---

## US-VF-08: Feedback Panel Component
Status: Completed
Priority: High
Dependencies: US-VF-01 (Video Analysis State Management), US-VF-02 (Video Player Component), US-VF-06 (Video Controls Component)

### User Story
As a user, I want to view and interact with a detailed feedback timeline in a bottom sheet using the existing feedback panel system so I can correlate specific comments with moments in the video.

### Requirements
- A draggable bottom sheet that extends to 40% of the screen height
- As the sheet slides up, the video player resizes, adding letterboxing if necessary
- The bottom sheet contains a tabbed interface for "Feedback", "Insights", and "Comments"
- The "Feedback" tab shows a scrollable list of timed AI comments
- The current feedback item is visually highlighted (karaoke-style)
- A thin progress bar with a draggable knob is positioned above the tabs for precise video scrubbing
- The tab navigation becomes sticky on scroll

### Acceptance Criteria
- Given I am on the video playback screen with the existing FeedbackPanel component
- When I slide the bottom sheet handle up
- Then the sheet expands and the video resizes to fit the remaining space
- And I can see a tabbed view with a timeline of feedback
- And scrolling the feedback list highlights the active comment synchronized with the video
- And dragging the progress bar knob seeks the video to the corresponding time
- And the tabs ("Feedback", "Insights", "Comments") remain visible at the top of the sheet when I scroll the content

### Technical Notes
- **UI**: Existing custom feedback panel implementation with Tamagui components, extending to 40% screen height
- **Layout**: Dynamic video player resizing with letterboxing when feedback panel expands
- **Tabs**: Tamagui Tabs component for "Feedback", "Insights", and "Comments" navigation
- **Progress Bar**: Custom draggable progress bar above tabs for precise video scrubbing
- **State Integration**: Subscribes to existing `videoAnalysisStore` for feedback data and timeline synchronization
- **Database**: Real-time feedback data from Supabase `analyses` table via Realtime subscriptions
- **Performance**: Virtualized feedback list with smooth scrolling for large datasets
- **Cross-platform**: Unified bottom sheet behavior for Expo (native) and Expo Router (web)
- **Accessibility**: WCAG 2.2 AA compliance with screen reader support and keyboard navigation
- **Component Location**: Existing `packages/ui/src/components/VideoAnalysis/FeedbackPanel/`
- **Sticky Navigation**: Tab navigation becomes sticky on scroll with smooth transitions

---

## US-VF-09: Video Analysis Screen (Integration)
Status: Completed
Priority: High
Dependencies: All previous components (US-VF-01 through US-VF-08)

### User Story
As a user, I want to see a complete video analysis experience that combines all the existing individual components into a cohesive screen so I can get comprehensive feedback on my performance.

### Requirements
- Integration of all video analysis components
- Seamless component interaction and data flow
- Screen-level state management and coordination
- Navigation integration with app routing
- Cross-platform screen implementation
- Performance optimization for component orchestration

### Acceptance Criteria
- Given I navigate to the existing video analysis screen
- When the screen loads
- Then all components are properly integrated and functional
- And data flows correctly between components
- And the screen performs smoothly on both web and native platforms
- And navigation works correctly with the app routing system
- And the screen handles errors gracefully across all components

### Technical Notes
- **Screen Location**: Existing `packages/app/features/VideoAnalysis/VideoAnalysisScreen.tsx`
- **Route Integration**: Expo Router route in `apps/expo/app/video-analysis.tsx`, Expo Router route in `apps/web/app/video-analysis.tsx`
- **State Coordination**: Orchestrates all component state through existing unified `videoAnalysisStore` with Zustand
- **AI Pipeline**: Complete integration with MoveNet Lightning pose detection and Gemini 2.5 analysis
- **Database Integration**: Supabase Realtime subscriptions for live analysis updates
- **Performance**: Optimized component rendering with < 10s total analysis time target
- **Cross-platform**: Existing unified screen implementation for Expo (iOS/Android) and Expo Router (web)
- **Error Handling**: Comprehensive error handling with discriminated unions and user-safe messages
- **Testing**: Integration tests covering component interactions and end-to-end analysis flow
- **Navigation**: Expo Router integration with proper navigation state management
- **Accessibility**: WCAG 2.2 AA compliance across all integrated components

---

## US-VF-10: Coach Avatar Component
Status: Completed
Priority: Low
Dependencies: US-VF-01 (Video Analysis State Management), US-VF-02 (Video Player Component), US-VF-04 (Feedback Bubble Component)

### User Story
As a user, I want to see the AI coach's avatar when receiving feedback using the existing avatar system so I can have a more engaging and personalized coaching experience.

### Requirements
- Coach avatar display in feedback bubbles and commentary
- Consistent coach identity representation across all feedback interactions
- Avatar integration with audio commentary and text feedback
- Smooth avatar animations during feedback delivery
- Platform-optimized avatar rendering for performance

### Acceptance Criteria
- Given feedback is being displayed in bubbles using the existing FeedbackBubbles component
- When the AI coach provides feedback
- Then the coach avatar appears next to the feedback text
- And the avatar maintains consistent appearance across all feedback types
- And avatar animations are smooth and non-distracting
- Given audio commentary is playing
- When the coach speaks
- Then the coach avatar is visible during audio playback
- And the avatar provides visual context for the voice feedback
- And avatar state changes appropriately during speech (optional breathing animation)

### Technical Notes
- **Avatar Design**: Existing coach avatar design representing the AI coach persona using Lucide User icon
- **Feedback Integration**: Avatar positioning within existing `FeedbackBubbles` component with speech bubble styling
- **Animation System**: Subtle animations using Tamagui animations (breathing effect, speaking indicators)
- **State Integration**: Subscribes to existing `videoAnalysisStore` for feedback state and timing synchronization
- **UI Components**: Tamagui View component with Lucide User icon for coach representation
- **Performance**: Static avatar icon with minimal animations to maintain 60fps playback
- **Cross-platform**: Unified avatar rendering for Expo (native) and Expo Router (web) implementations
- **Component Location**: Integrated within existing `packages/ui/src/components/VideoAnalysis/FeedbackBubbles/`
- **Accessibility**: Screen reader support for avatar presence with testID and accessibility labels
- **Asset Management**: Coach avatar implemented as Lucide icon with consistent theming