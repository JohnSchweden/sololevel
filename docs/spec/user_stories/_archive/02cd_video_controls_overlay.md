# US-FB-05: Access Video Playback Controls
Status: Pending
Priority: High
Dependencies: US-FB-04

### User Story
As a user, I want to control the video playback with standard controls so I can play, pause, and navigate the video.

### Requirements
- Tapping the video displays an overlay with playback controls.
- The overlay includes a header with a back button, title, and menu button.
- Central controls for play, pause, rewind, and fast-forward.
- A progress bar/scrubber showing current time and duration.
- A fullscreen toggle control.
- A menu button that triggers a fly-out menu.

### Acceptance Criteria
- Given the video is playing,
- When I tap on the video screen,
- Then an overlay appears with a pause button, progress bar, header, and other controls.
- When I tap the pause button, the video pauses and the button changes to a play icon.
- When I tap the play button, the video resumes and the button changes to a pause icon.
- When I tap the menu dots, a fly-out menu appears at the bottom of the screen.

### Technical Notes
- **UI**: Components will be built with Tamagui. Icons should be sourced from `lucide-react-native`.
- **State Management**: The video player's state (playing, paused, currentTime) will be managed by a Zustand store (`playerStore`).
- **Component**: Create a reusable `VideoControlOverlay` component in the `@my/ui` package.
- **Animation**: The overlay should fade in and out smoothly on tap.
