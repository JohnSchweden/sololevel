# Current Sprint Tasks

## US-RU-01: Record a video up to 60 seconds
Status: 85% Complete (Integration phase)
Priority: High
Dependencies: Camera and microphone permissions

### User Story
As a user, I want to record a video so I can get AI feedback.

### Requirements
- Video recording functionality with 60-second maximum duration
- Recording controls (Record, Pause/Resume, Stop)
- Real-time recording timer display
- Local video file storage
- Camera and microphone permission handling
- Video format compatibility for AI processing

### Acceptance Criteria
- Given camera and mic permissions are granted
- When I tap Record
- Then recording starts with visible timer and a hard limit of 60s
- And I can Pause/Resume and Stop
- And the final clip is saved locally for upload

### Technical Notes
- **Native**: Use `react-native-vision-camera` v4+ for recording with built-in 60s limit
- **Web**: Use MediaRecorder API with configurable bitrates and 60s hard limit
- **State**: Zustand store for recording state (`mediaStore`)
- **Storage**: Upload to Supabase Storage bucket `raw` via signed URL
- **Permissions**: Handle camera/mic permissions via Expo permissions API
- **File Management**: Use `expo-file-system` for local video storage
- **UI**: Tamagui components for recording controls and timer display
- **Cross-platform**: Unified recording interface via `@my/ui` package

---

## US-RU-06b: Recording states — Recording/Paused controls
Status: ✅ Complete
Priority: High
Dependencies: US-RU-01

### User Story
As a user, I want clear controls during recording and while paused.

### Acceptance Criteria
- Given a recording is in progress
- When viewing the controls
- Then I see a visible timer, Pause and Stop controls, Camera Settings, and Zoom level controls
- And zoom presets are fixed: 1x, 2x, 3x
- And Camera Swap is disabled while recording
- And a live motion capture overlay with nodes renders over the camera view and does not block interaction
- Given a recording is paused
- When viewing the controls
- Then I see Resume and Stop controls and the timer remains visible

---

## US-RU-07: Confirm navigation away while recording
Status: ✅ Complete
Priority: High
Dependencies: US-RU-01

### User Story
As a user, I want a warning if I try to leave mid-recording so I don't lose my clip by accident.

### Acceptance Criteria
- Given a recording is active or paused
- When I press Back or navigate away
- Then I see a confirmation dialog stating the video will be lost if I exit
- And choosing Cancel returns me to the recording; choosing Discard stops and deletes the in-progress clip

---

## US-RU-08: Live motion capture overlay with nodes (recording)
Status: ✅ Complete
Priority: High
Dependencies: Pose detection system

### User Story
As a user, I want a live motion overlay during recording to visualize body tracking.

### Acceptance Criteria
- Given recording is in progress or paused
- When viewing the camera
- Then a live motion capture overlay with nodes renders on top of the camera view
- And it does not block interaction with on-screen controls

---

## US-RU-09b: Camera controls — zoom & settings (recording)
Status: ✅ Complete
Priority: High
Dependencies: Camera system

### User Story
As a user, I want basic controls to improve capture while recording.

### Acceptance Criteria
- Given zoom level controls
- When I select 1x, 2x, or 3x
- Then the preview updates smoothly to that zoom
- Given Camera Settings
- When I open settings
- Then a sheet/modal appears with basic options (e.g., flash, grid) as defined in TRD

---

## US-RU-13: Video playback with live processing
Status: 🏗️ Infrastructure Ready, Integration Pending
Priority: High
Dependencies: US-RU-01, AI processing system

### User Story
As a user, I want immediate video playback with real-time AI analysis after recording.

### Acceptance Criteria
- Given I have finished recording a video
- When the recording stops
- Then the video is displayed with controls overlay visible
- And a loading spinner appears temporarily
- And AI processing begins automatically in the background
- And the controls overlay disappears automatically when playback starts
- And I can see live analysis results as they become available during playback
- And processing status updates are received in real-time
- And if processing fails, I see error handling and retry options

### Technical Notes
- **Integration**: Connect recording completion to video upload and AI processing pipeline
- **UI**: Video player with overlay controls and processing feedback
- **Real-time**: WebSocket or polling for processing status updates
- **Error Handling**: Retry mechanisms and user feedback for failures