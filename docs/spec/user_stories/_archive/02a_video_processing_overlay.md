# User Stories - Video Processing Overlay

## US-VF-02A: Video Processing with AI Analysis Overlay
Status: Pending
Priority: High
Dependencies: US-VF-01 (Video Recording), AI analysis pipeline

### User Story
As a user, I want to see my recorded video with real-time AI analysis overlay so I can understand my performance while watching the playback.

### Requirements
- Video playback with AI analysis overlay
- Skeletal tracking visualization with joint detection
- Real-time feedback bubbles with contextual messages
- Loading spinner during AI processing
- Auto-generated video title based on content analysis
- Video controls that auto-hide after 3 seconds
- Live processing status indicators
- Seamless transition from recording to analysis

### Acceptance Criteria
- Given I have completed recording a video
- When the video processing begins
- Then I see the video playback with skeletal overlay
- And a loading spinner appears during AI analysis
- And feedback bubbles show real-time insights ("Nice grip!", "Bend your knees...")
- And the video title is automatically generated ("Q3 Sales Presentation")
- And video controls are visible for 3 seconds then auto-hide
- And I can see "Video - Live Processing" status

### Technical Notes
- **AI Pipeline**: Pose detection with MediaPipe or similar for skeletal tracking
- **Overlay System**: Canvas-based overlay for skeletal visualization and feedback bubbles
- **State Management**: Zustand store for video processing state (`videoAnalysisStore`)
- **Real-time Updates**: WebSocket or polling for live analysis results
- **Video Player**: Custom video player with overlay controls and auto-hide functionality
- **Title Generation**: LLM integration for contextual video title generation
- **UI Components**: Tamagui components for feedback bubbles, loading states, and video controls
- **Cross-platform**: Unified overlay system via `@my/ui` package with platform-specific optimizations

---

## US-VF-02B: Skeletal Tracking Visualization
Status: Pending
Priority: High
Dependencies: US-VF-02A (Video Processing Overlay)

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
- **Visualization**: Canvas or SVG-based skeletal rendering
- **Performance**: Optimized rendering with requestAnimationFrame
- **Overlay Management**: Z-index and transparency controls
- **Joint Mapping**: Standard pose keypoint mapping (shoulders, elbows, wrists, etc.)
- **State Updates**: Real-time pose data streaming from AI analysis
- **Cross-platform**: WebGL/Canvas for web, native rendering for mobile

---

## US-VF-02C: Real-time Feedback Bubbles
Status: Pending
Priority: High
Dependencies: US-VF-02A (Video Processing Overlay)

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

### Acceptance Criteria
- Given the video is playing with AI analysis
- When the AI detects specific movements or postures
- Then contextual feedback bubbles appear
- And positive feedback is shown for good form ("Nice grip!")
- And improvement suggestions are provided ("Bend your knees...")
- And messages are positioned to not obstruct video content
- And feedback updates in real-time as analysis progresses

### Technical Notes
- **AI Analysis**: Pose analysis with movement pattern recognition
- **Feedback Engine**: Rule-based or ML-based feedback generation
- **UI Components**: Tamagui speech bubble components with animations
- **Message Queue**: Prioritized feedback message system
- **Positioning**: Smart positioning to avoid content obstruction
- **Timing**: Synchronized feedback with video timeline
- **Localization**: Multi-language support for feedback messages
- **Accessibility**: Screen reader support for feedback content

---

## US-VF-02D: Auto-generated Video Titles
Status: Pending
Priority: Medium
Dependencies: US-VF-02A (Video Processing Overlay)

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
- **UI Integration**: Header component with title display and editing
- **State Management**: Title state in video analysis store
- **Performance**: Async title generation to not block video playback
- **Caching**: Title caching for repeated analysis

---

## US-VF-02E: Auto-hiding Video Controls
Status: Pending
Priority: Medium
Dependencies: US-VF-02A (Video Processing Overlay)

### User Story
As a user, I want video controls to automatically hide after a few seconds so I can have an unobstructed view of the AI analysis overlay.

### Requirements
- Video controls overlay with play/pause, progress bar, and fullscreen
- Auto-hide functionality after 3 seconds of inactivity
- Touch-to-show controls when hidden
- Smooth fade in/out animations
- Progress bar with current time display (0:01 / 3:21)
- Fullscreen toggle functionality
- User profile/avatar icon

### Acceptance Criteria
- Given the video is playing with analysis overlay
- When the video starts playing
- Then video controls are visible for 3 seconds
- And controls automatically fade out after 3 seconds
- And I can tap the video to show controls again
- And controls include play/pause, progress bar, and fullscreen
- And progress shows current time and total duration
- And controls fade in/out smoothly

### Technical Notes
- **Control Overlay**: Tamagui-based video control components
- **Auto-hide Logic**: Timer-based control visibility management
- **Touch Handling**: Gesture detection for control show/hide
- **Animations**: Smooth fade transitions using Tamagui animations
- **Progress Bar**: Custom progress component with time display
- **Fullscreen**: Platform-specific fullscreen implementation
- **State Management**: Control visibility state in video player store
- **Accessibility**: Keyboard navigation and screen reader support
