# User Stories — Recording State & Analysis (P0)

References: `../PRD.md`, `../TRD.md`, `../01b_recording.png`

Note: The camera and recording are one screen with different states. This file covers Recording and Paused states, plus immediate post-recording playback and analysis.

## US-RU-01: Record a video up to 60 seconds
- As a user, I want to record a video so I can get AI feedback.
- Priority: P0
- Acceptance Criteria:
  - Given camera and mic permissions are granted
  - When I tap Record
  - Then recording starts with visible timer and a hard limit of 60s
  - And I can Pause/Resume and Stop
  - And the final clip is saved locally for upload

## US-RU-06b: Recording states — Recording/Paused controls
- As a user, I want clear controls during recording and while paused.
- Priority: P0
- Acceptance Criteria:
  - Given a recording is in progress
  - When viewing the controls
  - Then I see a visible timer, Pause and Stop controls, Camera Settings, and Zoom level controls
  - And zoom presets are fixed: 1x, 2x, 3x
  - And Camera Swap is disabled while recording
  - And a live motion capture overlay with nodes renders over the camera view and does not block interaction
  - Given a recording is paused
  - When viewing the controls
  - Then I see Resume and Stop controls and the timer remains visible

## US-RU-07: Confirm navigation away while recording
- As a user, I want a warning if I try to leave mid-recording so I don’t lose my clip by accident.
- Priority: P0
- Acceptance Criteria:
  - Given a recording is active or paused
  - When I press Back or navigate away
  - Then I see a confirmation dialog stating the video will be lost if I exit
  - And choosing Cancel returns me to the recording; choosing Discard stops and deletes the in-progress clip

## US-RU-08: Live motion capture overlay with nodes (recording)
- As a user, I want a live motion overlay during recording to visualize body tracking.
- Priority: P0
- Acceptance Criteria:
  - Given recording is in progress or paused
  - When viewing the camera
  - Then a live motion capture overlay with nodes renders on top of the camera view
  - And it does not block interaction with on-screen controls

## US-RU-09b: Camera controls — zoom & settings (recording)
- As a user, I want basic controls to improve capture while recording.
- Priority: P0
- Acceptance Criteria:
  - Given zoom level controls
  - When I select 1x, 2x, or 3x
  - Then the preview updates smoothly to that zoom
  - Given Camera Settings
  - When I open settings
  - Then a sheet/modal appears with basic options (e.g., flash, grid) as defined in TRD

## US-RU-13: Video playback with live processing (moved here)
- As a user, I want immediate video playback with real-time AI analysis after recording.
- Priority: P0
- Acceptance Criteria:
  - Given I have finished recording a video
  - When the recording stops
  - Then the video is displayed with controls overlay visible
  - And a loading spinner appears temporarily
  - And AI processing begins automatically in the background (see US-AN-01, US-AN-02)
  - And the controls overlay disappears automatically when playback starts
  - And I can see live analysis results as they become available during playback
  - And processing status updates are received in real-time (see US-AN-02)
  - And if processing fails, I see error handling and retry options (see US-AN-04)

## Non-functional
- Upload success p95 ≥ 99% on 3G+ networks for 60s clips
- Progress updates at least every 500ms
- No crashes or UI freezes during capture or upload


