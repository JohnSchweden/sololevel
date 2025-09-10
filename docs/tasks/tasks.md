# Current Sprint Tasks

## US-RU-01: Record a video up to 60 seconds
Status: Done
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