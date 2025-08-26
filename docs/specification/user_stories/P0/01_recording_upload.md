# User Stories — Recording & Upload (P0)

References: `../PRD.md`, `../TRD.md`, `../wireflow.png`

## US-RU-01: Record a video up to 60 seconds
- As a user, I want to record a video so I can get AI feedback.
- Priority: P0
- Acceptance Criteria:
  - Given camera and mic permissions are granted
  - When I tap Record
  - Then recording starts with visible timer and a hard limit of 60s
  - And I can Pause/Resume and Stop
  - And the final clip is saved locally for upload

## US-RU-02: Handle permissions gracefully
- As a user, I want clear prompts for camera/microphone permissions.
- Priority: P0
- Acceptance Criteria:
  - Given permissions are not granted
  - When I open the record screen
  - Then I see a rationale modal with Go to Settings option
  - And the UI shows disabled controls until permissions granted

## US-RU-03: Upload an existing video (MP4/MOV)
- As a user, I want to select a video from my library.
- Priority: P0
- Acceptance Criteria:
  - Given I select a local MP4/MOV ≤ 60s
  - When I confirm selection
  - Then the app validates format and duration
  - And the video is queued for upload

## US-RU-04: Background upload with progress and retry
- As a user, I want reliable uploads on mobile networks.
- Priority: P0
- Acceptance Criteria:
  - Given an upload is in progress
  - When network fluctuates
  - Then I see progress, remaining size, and retry-on-failure
  - And uploads resume automatically after connectivity returns
  - And I can cancel the upload before completion

## US-RU-05: Secure upload to Supabase Storage (raw)
- As a user, I want my video uploaded securely.
- Priority: P0
- Acceptance Criteria:
  - Given a selected/recorded video
  - When uploading
  - Then the app uses a short-lived signed URL to bucket `raw`
  - And on success I receive the storage path for analysis

## US-RU-06: Recording states and controls (Idle/Recording/Paused)
- As a user, I want clear controls for each recording state so I never guess what to press.
- Priority: P0
- Acceptance Criteria:
  - Given I am on the record screen and no recording is active
  - When viewing the controls
  - Then I see a primary Record button, an Upload button showing the last video thumbnail, Camera Swap, Camera Settings, and Zoom level controls (e.g., 1x/2x/3x).
  - Given a recording is in progress
  - When viewing the controls
  - Then I see a visible timer, Pause and Stop controls, and Zoom level controls
  - And Camera Swap is disabled while recording
  - And using the Back action prompts a confirmation before discarding.
  - Given a recording is paused
  - When viewing the controls
  - Then I see Resume and Stop controls and the timer remains visible.

## US-RU-07: Confirm navigation away while recording
- As a user, I want a warning if I try to leave mid-recording so I don’t lose my clip by accident.
- Priority: P0
- Acceptance Criteria:
  - Given a recording is active or paused
  - When I press Back or navigate away
  - Then I see a confirmation dialog stating the video will be lost if I exit
  - And choosing Cancel returns me to the recording; choosing Discard stops and deletes the in-progress clip.

## US-RU-08: Live motion capture overlay with nodes
- As a user, I want a live motion overlay during preview/recording to visualize body tracking.
- Priority: P0
- Acceptance Criteria:
  - Given the record screen is open
  - When previewing or recording
  - Then a live motion capture overlay with nodes renders on top of the camera view
  - And it does not block interaction with on-screen controls.

## US-RU-09: Camera controls — swap, zoom, settings
- As a user, I want basic camera controls for better capture quality.
- Priority: P0
- Acceptance Criteria:
  - Given the camera preview is visible
  - When I tap Camera Swap while not recording
  - Then the camera toggles between front and back.
  - Given zoom level controls (1x/2x/3x)
  - When I select a level
  - Then the preview updates smoothly to that zoom.
  - Given Camera Settings
  - When I open settings
  - Then a sheet/modal appears with basic options (e.g., flash, grid) as defined in TRD.

## US-RU-10: Bottom navigation — Coach / Record / Insights
- As a user, I want to switch between core areas quickly using bottom navigation.
- Priority: P0
- Acceptance Criteria:
  - Given the app is open
  - When I view the bottom navigation
  - Then I see three tabs: Coach, Record, Insights
  - And the Record tab is selected on the recording screen
  - And tapping a tab navigates to its respective screen.

## US-RU-11: Notifications with badge
- As a user, I want to notice new activity at a glance.
- Priority: P0
- Acceptance Criteria:
  - Given there are unread notifications
  - When I open the record screen
  - Then I see a notifications icon with a badge count
  - And tapping it opens the notifications list.

## US-RU-12: Side-sheet with previous videos and coach conversations
- As a user, I want quick access to my prior uploads and coach chats.
- Priority: P0
- Acceptance Criteria:
  - Given I am on the record screen
  - When I tap the side-sheet menu or swipe from the edge
  - Then a side sheet opens listing previous videos (with thumbnails) and past coach conversations
  - And selecting an item navigates to its detail view (video playback or chat thread).

## US-RU-13: Video playback with live processing (02_analysis_job_and_progress.md)
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
  - And if processing fails, I see error handling and retry options (see US-AN-04).

## Non-functional
- Upload success p95 ≥ 99% on 3G+ networks for 60s clips
- Progress updates at least every 500ms
- No crashes or UI freezes during capture or upload
