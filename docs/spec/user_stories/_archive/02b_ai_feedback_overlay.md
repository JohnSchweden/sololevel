# US-FB-04: Display Real-Time AI Feedback Overlay
Status: Pending
Priority: High
Dependencies: Video playback component, AI analysis service

### User Story
As a user, I want to see real-time motion capture and AI-driven feedback overlaid on my video so that I can get immediate visual guidance on my performance.

### Requirements
- Display a skeletal motion capture overlay on the video.
- Show streaming AI feedback in a text bubble.
- Display an avatar icon (static image for V1).
- The overlay should be visible during video playback.

### Acceptance Criteria
- Given the video is playing,
- When AI feedback is available,
- Then a skeletal overlay is rendered on top of the video, synchronized with the user's movements.
- And a text bubble appears with the current AI feedback.
- And a static avatar icon is displayed near the text bubble.

### Technical Notes
- **UI**: Use Tamagui for all UI components, including the text bubble and avatar.
- **Rendering**: The motion capture overlay will likely require a custom component using `react-native-svg` or a similar library to draw the skeleton and nodes.
- **State Management**: Use a Zustand store (`feedbackStore`) to manage the stream of AI feedback and skeleton data.
- **Data Flow**: The component will subscribe to real-time data from the AI analysis service.

---

## US-FB-02: Listen to audio commentary (TTS)
Status: Pending
Priority: P0
Dependencies: US-FB-04

### User Story
As a user, I want narrated feedback so I can receive audio commentary synchronized with my video playback.

### Requirements
- Audio commentary playback synchronized with video
- Automatic video pause when audio feedback is available
- Audio playback controls (play/pause/seek)
- Automatic video resume after audio ends

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
- **Synchronization**: Coordinate video and audio playback through the `playerStore` Zustand store
- **UI**: Audio controls should be integrated into the existing video overlay
- **State Management**: Track audio playback state and sync with video timeline
- **Format Optimization**: AAC/MP3 formats reduce file size by 75%+ and improve mobile compatibility
