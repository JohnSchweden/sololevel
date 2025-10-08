# Video Analysis Overlay Tasks

## US-VA-01: Video playback with AI analysis overlay
Status: Pending
Priority: High
Dependencies: Video recording completion, AI analysis pipeline

### User Story
As a user, I want to see my recorded video with real-time AI analysis overlay so I can get immediate feedback on my performance.

### Requirements
- Automatic video playback after recording completion
- Skeletal tracking visualization overlay on video
- Real-time AI feedback bubbles with contextual messages
- Auto-generated video title based on content analysis
- Loading spinner during AI processing
- Video controls overlay that auto-hides after 3 seconds
- Live processing during video playback

### Acceptance Criteria
- Given I have finished recording a video
- When the recording stops
- Then the video starts playing immediately with controls overlay visible
- And a loading spinner appears during AI processing
- And skeletal tracking visualization is overlaid on the video
- And feedback bubbles appear with contextual messages (e.g., "Nice grip!", "Bend your knees...")
- And the video title is auto-generated based on content analysis
- And the controls overlay disappears automatically after 3 seconds
- And AI analysis continues processing during playback

### Technical Notes
- **Video Player**: Use `expo-av` or `react-native-video` for cross-platform playback
- **Overlay System**: Tamagui components with absolute positioning for skeletal tracking
- **AI Integration**: Real-time pose detection via TensorFlow Lite models
- **State Management**: Zustand store for analysis state and feedback messages
- **Animation**: Smooth transitions for overlay appearance/disappearance
- **Performance**: Optimize overlay rendering to maintain 60fps video playback
- **Cross-platform**: Unified overlay system via `@my/ui` package
- **Feedback System**: Dynamic bubble positioning based on detected pose points

---

## US-VA-02: Skeletal tracking visualization
Status: Pending
Priority: High
Dependencies: AI pose detection model, video playback

### User Story
As a user, I want to see a skeletal overlay on my video so I can understand how the AI is analyzing my movements.

### Requirements
- Real-time skeletal figure overlay on video
- Joint detection and connection visualization
- Dashed line style for non-intrusive display
- Dynamic positioning based on detected pose
- Smooth animation between pose changes

### Acceptance Criteria
- Given video playback is active
- When AI pose detection is running
- Then a skeletal figure is overlaid on the video
- And joints are represented as circles
- And connections between joints are shown as dashed lines
- And the skeleton updates in real-time with detected poses
- And the overlay is semi-transparent to not obstruct video content

### Technical Notes
- **Pose Detection**: TensorFlow Lite pose detection model
- **Rendering**: Canvas or SVG overlay for skeletal visualization
- **Performance**: Optimize rendering to maintain video playback performance
- **Styling**: Tamagui tokens for colors and transparency
- **Cross-platform**: Unified rendering system for web and native

---

## US-VA-03: Real-time feedback bubbles
Status: Pending
Priority: High
Dependencies: AI analysis pipeline, skeletal tracking

### User Story
As a user, I want to receive contextual feedback messages during video playback so I can understand what I'm doing well and what to improve.

### Requirements
- Contextual feedback messages based on pose analysis
- Speech bubble-style UI elements
- Dynamic positioning near relevant body parts
- Smooth fade-in/fade-out animations
- Multiple feedback types (positive, corrective, tips)

### Acceptance Criteria
- Given AI analysis is processing the video
- When specific movements or poses are detected
- Then relevant feedback bubbles appear on screen
- And messages are contextual (e.g., "Nice grip!", "Bend your knees...")
- And bubbles are positioned near the relevant body parts
- And bubbles fade in smoothly and disappear after a few seconds
- And multiple feedback types are supported (positive, corrective, tips)

### Technical Notes
- **AI Analysis**: LLM-based feedback generation from pose data
- **UI Components**: Tamagui speech bubble components with animations
- **Positioning**: Dynamic positioning based on skeletal joint locations
- **Content**: Pre-defined feedback templates with contextual triggers
- **Animation**: Smooth transitions using Tamagui animation system
- **Accessibility**: Screen reader support for feedback messages

---

## US-VA-04: Auto-generated video titles
Status: Pending
Priority: Medium
Dependencies: AI content analysis

### User Story
As a user, I want my video to have an automatically generated title so I can easily identify the content without manual input.

### Requirements
- Automatic title generation based on video content analysis
- Context-aware naming (e.g., "Q3 Sales Presentation", "Golf Swing Analysis")
- Title display in video player header
- Fallback to timestamp if analysis fails

### Acceptance Criteria
- Given a video has been recorded
- When AI analysis begins
- Then a title is automatically generated based on content
- And the title appears in the video player header
- And the title is contextually relevant to the video content
- And if title generation fails, a timestamp-based fallback is used

### Technical Notes
- **AI Analysis**: LLM-based content understanding and title generation
- **Context Detection**: Analyze pose patterns, duration, and movement types
- **UI Integration**: Display in video player header with proper styling
- **Fallback Strategy**: Use recording timestamp as backup title
- **Performance**: Generate title asynchronously without blocking playback

---

## US-VA-05: Video controls auto-hide behavior
Status: Pending
Priority: Medium
Dependencies: Video playback system

### User Story
As a user, I want video controls to automatically hide during playback so I can focus on the content and AI feedback without UI distractions.

### Requirements
- Video controls overlay visible initially after recording
- Automatic hiding after 3 seconds of playback
- Touch-to-show controls functionality
- Smooth fade transitions
- Progress bar and fullscreen controls remain accessible

### Acceptance Criteria
- Given video playback has started
- When the video begins playing
- Then controls overlay is visible initially
- And controls automatically fade out after 3 seconds
- And tapping the video shows controls again
- And controls fade out again after 3 seconds of inactivity
- And essential controls (progress, fullscreen) remain accessible

### Technical Notes
- **Timer Management**: Use React hooks for auto-hide timing
- **Touch Handling**: Detect video area taps to show/hide controls
- **Animation**: Smooth fade transitions using Tamagui animations
- **State Management**: Track control visibility state in video store
- **Accessibility**: Ensure controls are accessible via screen readers
- **Cross-platform**: Unified behavior across web and native platforms
