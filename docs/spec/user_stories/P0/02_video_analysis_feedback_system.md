# User Stories - Video Analysis & Feedback System (Component-Based)

## US-VF-01: Video Analysis State Management
Status: Pending
Priority: High
Dependencies: US-RU-01 (Video Recording), AI analysis pipeline

### User Story
As a developer, I want a centralized state management system for video analysis so that all components can share and synchronize video processing data.

### Requirements
- Centralized video analysis state management
- Real-time pose data streaming and storage
- Analysis progress tracking and status updates
- Error handling and retry mechanisms
- Cross-component state synchronization
- Performance optimization for large datasets

### Acceptance Criteria
- Given a video analysis session starts
- When pose data is received from AI pipeline
- Then the state store updates with new pose data
- And all subscribed components receive updates
- And analysis progress is tracked and displayed
- And errors are handled gracefully with retry options
- And state persists across component unmounts/remounts

### Technical Notes
- **State Management**: Zustand store (`videoAnalysisStore`) for centralized state
- **Real-time Updates**: WebSocket or polling for live analysis results
- **Data Flow**: Pose data streaming from AI analysis service
- **Performance**: Optimized state updates with selective subscriptions
- **Error Handling**: Discriminated union results for error states
- **Persistence**: State persistence across component lifecycle
- **Cross-platform**: Unified state management for web and native

---

## US-VF-02: Video Player Component
Status: Pending
Priority: High
Dependencies: US-VF-01 (Video Analysis State Management)

### User Story
As a user, I want a video player that can display video content with overlay capabilities so I can see my recorded performance with AI analysis overlays.

### Requirements
- Video playback with overlay support
- Cross-platform video rendering (react-native-video/HTML5)
- Overlay positioning and z-index management
- Video loading states and error handling
- Performance optimization for smooth playback
- Accessibility support for video controls

### Acceptance Criteria
- Given a video file is provided
- When the video player loads
- Then the video plays smoothly at 60fps
- And overlay components can be positioned over the video
- And loading states are displayed during video preparation
- And errors are handled gracefully with user feedback
- And the player supports keyboard navigation (web) and touch gestures (native)

### Technical Notes
- **Video Rendering**: `react-native-video` for native, HTML5 `<video>` for web
- **Overlay System**: Canvas-based overlay positioning with z-index management
- **Performance**: Optimized rendering with requestAnimationFrame
- **State Integration**: Subscribes to `videoAnalysisStore` for video metadata
- **Cross-platform**: Unified video player interface via `@my/ui` package
- **Accessibility**: Screen reader support and keyboard navigation
- **Error Handling**: Graceful degradation for unsupported formats

---

## US-VF-03: Skeleton Overlay Component
Status: Pending
Priority: High
Dependencies: US-VF-01 (Video Analysis State Management), US-VF-02 (Video Player Component)

### User Story
As a user, I want to see a skeletal representation of my movements overlaid on the video so I can understand how the AI is analyzing my posture and form.

### Requirements
- Real-time skeletal joint detection and visualization
- Dashed-line skeletal figure with joint circles
- Dynamic pose tracking throughout video playback
- Visual feedback for detected movements
- Overlay transparency and positioning
- Performance optimization for smooth tracking

### Acceptance Criteria
- Given the video is playing with AI analysis
- When skeletal tracking is active
- Then I see a light gray dashed-line skeletal figure
- And joint positions are marked with circles
- And the skeleton updates in real-time with my movements
- And the overlay doesn't obstruct important video content
- And tracking performance is smooth without lag

### Technical Notes
- **Pose Detection**: MediaPipe Pose or TensorFlow.js for real-time joint detection
- **Visualization**: Canvas or SVG-based skeletal rendering using `react-native-svg`
- **Performance**: Optimized rendering with requestAnimationFrame
- **Overlay Management**: Z-index and transparency controls
- **Joint Mapping**: Standard pose keypoint mapping (shoulders, elbows, wrists, etc.)
- **State Integration**: Subscribes to `videoAnalysisStore` for pose data
- **Cross-platform**: WebGL/Canvas for web, native rendering for mobile
- **Component Location**: `packages/ui/components/SkeletonOverlay/`

---

## US-VF-04: Feedback Bubble Component
Status: Pending
Priority: High
Dependencies: US-VF-01 (Video Analysis State Management), US-VF-02 (Video Player Component)

### User Story
As a user, I want to receive contextual feedback messages during video playback so I can understand what I'm doing well and what needs improvement.

### Requirements
- Contextual feedback messages based on pose analysis
- Speech bubble-style UI for feedback display
- Real-time message updates during playback
- Positive reinforcement ("Nice grip!")
- Improvement suggestions ("Bend your knees a little bit and keep your back straight!")
- Message positioning and timing
- Feedback categorization and prioritization
- Static avatar icon display (V1)

### Acceptance Criteria
- Given the video is playing with AI analysis
- When the AI detects specific movements or postures
- Then contextual feedback bubbles appear
- And positive feedback is shown for good form ("Nice grip!")
- And improvement suggestions are provided ("Bend your knees...")
- And messages are positioned to not obstruct video content
- And feedback updates in real-time as analysis progresses
- And a static avatar icon is displayed near the text bubble

### Technical Notes
- **AI Analysis**: Pose analysis with movement pattern recognition
- **Feedback Engine**: Rule-based or ML-based feedback generation
- **UI Components**: Tamagui speech bubble components with animations
- **Message Queue**: Prioritized feedback message system
- **Positioning**: Smart positioning to avoid content obstruction
- **Timing**: Synchronized feedback with video timeline
- **State Integration**: Subscribes to `videoAnalysisStore` for feedback data
- **Localization**: Multi-language support for feedback messages
- **Accessibility**: Screen reader support for feedback content
- **Component Location**: `packages/ui/components/FeedbackBubble/`

---

## US-VF-05: Video Title Component
Status: Pending
Priority: Medium
Dependencies: US-VF-01 (Video Analysis State Management)

### User Story
As a user, I want my videos to have automatically generated titles based on their content so I can easily identify and organize my recordings.

### Requirements
- AI-powered video title generation
- Context-aware title creation based on detected activities
- Real-time title updates as analysis progresses
- Fallback to timestamp-based titles if analysis fails
- Title display in video player header
- Title editing capability for user customization

### Acceptance Criteria
- Given a video has been recorded and analysis begins
- When the AI processes the video content
- Then a contextual title is generated (e.g., "Q3 Sales Presentation")
- And the title appears in the video player header
- And the title updates if better context is detected
- And I can edit the title if needed
- And a fallback title is provided if AI analysis fails

### Technical Notes
- **LLM Integration**: GPT or similar for contextual title generation
- **Content Analysis**: Video content understanding and activity detection
- **Title Generation**: Prompt engineering for relevant title creation
- **Fallback System**: Timestamp or user-defined fallback titles
- **State Integration**: Subscribes to `videoAnalysisStore` for title data
- **Performance**: Async title generation to not block video playback
- **Caching**: Title caching for repeated analysis
- **Component Location**: `packages/ui/components/VideoTitle/`

---

## US-VF-06: Video Controls Component
Status: Pending
Priority: High
Dependencies: US-VF-01 (Video Analysis State Management), US-VF-02 (Video Player Component)

### User Story
As a user, I want to control the video playback with standard controls so I can play, pause, and navigate the video with an unobstructed view of the AI analysis.

### Requirements
- Video controls overlay with play/pause, progress bar, and fullscreen
- Auto-hide functionality after 3 seconds of inactivity
- Touch-to-show controls when hidden
- Smooth fade in/out animations
- Progress bar with current time display (0:01 / 3:21)
- Fullscreen toggle functionality
- User profile/avatar icon
- Header with back button, title, and menu button
- Central controls for play, pause, rewind, and fast-forward
- Menu button that triggers a fly-out menu

### Acceptance Criteria
- Given the video is playing with analysis overlay
- When the video starts playing
- Then video controls are visible for 3 seconds
- And controls automatically fade out after 3 seconds
- And I can tap the video to show controls again
- And controls include play/pause, progress bar, and fullscreen
- And progress shows current time and total duration
- And controls fade in/out smoothly
- When I tap the pause button, the video pauses and the button changes to a play icon
- When I tap the play button, the video resumes and the button changes to a pause icon
- When I tap the menu dots, a fly-out menu appears at the bottom of the screen

### Technical Notes
- **Control Overlay**: Tamagui-based video control components
- **Auto-hide Logic**: Timer-based control visibility management
- **Touch Handling**: Gesture detection for control show/hide
- **Animations**: Smooth fade transitions using Tamagui animations
- **Progress Bar**: Custom progress component with time display
- **Fullscreen**: Platform-specific fullscreen implementation
- **State Integration**: Subscribes to `videoAnalysisStore` for player state
- **UI Components**: Icons from `lucide-react-native`, reusable `VideoControlOverlay` component
- **Accessibility**: Keyboard navigation and screen reader support
- **Component Location**: `packages/ui/components/VideoControls/`

---

## US-VF-07: Audio Commentary Component
Status: Pending
Priority: High
Dependencies: US-VF-01 (Video Analysis State Management), US-VF-02 (Video Player Component), US-VF-06 (Video Controls Component)

### User Story
As a user, I want narrated feedback so I can receive audio commentary synchronized with my video playback.

### Requirements
- Audio commentary playback synchronized with video
- Automatic video pause when audio feedback is available
- Audio playback controls (play/pause/seek)
- Automatic video resume after audio ends
- TTS-generated audio from AI feedback

### Acceptance Criteria
- Given an `audio_url` exists
- When I press Play I see the video playback
- And at the time of the available feedback the video playback is automatically paused without pause overlay
- And the audio streams with play/pause/seek controls
- Finally the video is resumed after audio stream ends

### Technical Notes
- **Audio Playback**: Use `react-native-video` for unified video/audio playback (primary approach)
- **Audio Fallback**: `react-native-sound` if needed for dedicated audio-only files
- **TTS Pipeline**: Audio generated via Gemini TTS 2.0 in Edge Functions, converted to AAC/MP3 format, stored in Supabase Storage
- **State Integration**: Subscribes to `videoAnalysisStore` for audio data and synchronization
- **UI**: Audio controls integrated into the existing video overlay
- **State Management**: Track audio playback state and sync with video timeline
- **Format Optimization**: AAC/MP3 formats reduce file size by 75%+ and improve mobile compatibility
- **Component Location**: `packages/ui/components/AudioCommentary/`

---

## US-VF-08: Feedback Panel Component
Status: Pending
Priority: High
Dependencies: US-VF-01 (Video Analysis State Management), US-VF-02 (Video Player Component), US-VF-06 (Video Controls Component)

### User Story
As a user, I want to view and interact with a detailed feedback timeline in a bottom sheet so I can correlate specific comments with moments in the video.

### Requirements
- A draggable bottom sheet that extends to 40% of the screen height
- As the sheet slides up, the video player resizes, adding letterboxing if necessary
- The bottom sheet contains a tabbed interface for "Feedback", "Insights", and "Comments"
- The "Feedback" tab shows a scrollable list of timed AI comments
- The current feedback item is visually highlighted (karaoke-style)
- A thin progress bar with a draggable knob is positioned above the tabs for precise video scrubbing
- The tab navigation becomes sticky on scroll

### Acceptance Criteria
- Given I am on the video playback screen
- When I slide the bottom sheet handle up
- Then the sheet expands and the video resizes to fit the remaining space
- And I can see a tabbed view with a timeline of feedback
- And scrolling the feedback list highlights the active comment synchronized with the video
- And dragging the progress bar knob seeks the video to the corresponding time
- And the tabs ("Feedback", "Insights", "Comments") remain visible at the top of the sheet when I scroll the content

### Technical Notes
- **UI**: Use a bottom sheet component, potentially from a library like `@gorhom/bottom-sheet` adapted for Tamagui, or a custom implementation. Tabs can be built with Tamagui's `Tabs`
- **Layout**: The screen layout will need to dynamically adjust the video player's height based on the bottom sheet's position
- **State Integration**: Subscribes to `videoAnalysisStore` for feedback items and current time synchronization
- **Performance**: Virtualize the feedback list to ensure smooth scrolling with a large number of comments
- **Cross-platform**: Ensure bottom sheet behavior works consistently on both web and native platforms
- **Accessibility**: Support for screen readers and keyboard navigation within the bottom sheet
- **Component Location**: `packages/ui/components/FeedbackPanel/`

---

## US-VF-09: Video Analysis Screen (Integration)
Status: Pending
Priority: High
Dependencies: All previous components (US-VF-01 through US-VF-08)

### User Story
As a user, I want to see a complete video analysis experience that combines all the individual components into a cohesive screen so I can get comprehensive feedback on my performance.

### Requirements
- Integration of all video analysis components
- Seamless component interaction and data flow
- Screen-level state management and coordination
- Navigation integration with app routing
- Cross-platform screen implementation
- Performance optimization for component orchestration

### Acceptance Criteria
- Given I navigate to the video analysis screen
- When the screen loads
- Then all components are properly integrated and functional
- And data flows correctly between components
- And the screen performs smoothly on both web and native platforms
- And navigation works correctly with the app routing system
- And the screen handles errors gracefully across all components

### Technical Notes
- **Screen Location**: `packages/app/features/VideoAnalysis/VideoAnalysisScreen.tsx`
- **Route Integration**: Expo Router route in `apps/expo/app/video-analysis.tsx`, Expo Router route in `apps/next/app/video-analysis.tsx`
- **State Coordination**: Orchestrates all component state through `videoAnalysisStore`
- **Performance**: Optimized component rendering and data flow
- **Cross-platform**: Unified screen implementation for web and native
- **Error Handling**: Comprehensive error handling across all integrated components
- **Testing**: Integration tests for complete screen functionality

