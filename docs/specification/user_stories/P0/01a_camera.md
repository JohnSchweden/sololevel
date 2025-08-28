# User Stories — Camera (Idle) & Navigation (P0)

References: `../PRD.md`, `../TRD.md`, `../01a_camera.png`

Note: The camera and recording are one screen with different states. This file covers the Idle state and shared chrome visible while idle.

## US-RU-02: Handle permissions gracefully
- As a user, I want clear prompts for camera/microphone permissions.
- Priority: P0
- Acceptance Criteria:
  - Given permissions are not granted
  - When I open the record screen
  - Then I see a rationale modal with Go to Settings option
  - And the UI shows disabled controls until permissions granted

## US-RU-06a: Recording states — Idle controls
- As a user, I want clear controls when idle so I know how to start.
- Priority: P0
- Acceptance Criteria:
  - Given I am on the record screen and no recording is active
  - When viewing the controls
  - Then I see a primary Record button, an Upload icon button, and Camera Swap
  - And the camera preview is running and ready to record
  - And a live motion capture overlay with nodes renders on top of the camera view and does not block interaction.

## US-RU-03: Upload an existing video (MP4/MOV)
- As a user, I want to select a video from my library or filesystem.
- Priority: P0
- Acceptance Criteria:
  - Given I tap the Upload icon button
  - Then the native popup menu appears with options for library and filesystem (and camera if available)
  - And after selecting a local MP4/MOV ≤ 60s
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

## US-RU-09a: Camera controls — swap (idle)
- As a user, I want to switch between front and back cameras before recording.
- Priority: P0
- Acceptance Criteria:
  - Given the camera preview is visible and not recording
  - When I tap Camera Swap
  - Then the camera toggles between front and back

## US-RU-10: Bottom navigation — Coach / Record / Insights
- As a user, I want to switch between core areas quickly using bottom navigation.
- Priority: P0
- Acceptance Criteria:
  - Given the app is open
  - When I view the bottom navigation
  - Then I see three tabs: Coach, Record, Insights
  - And the Record tab is selected on the recording screen
  - And tapping a tab navigates to its respective screen

## US-RU-11: Notifications with badge
- As a user, I want to notice new activity at a glance.
- Priority: P0
- Acceptance Criteria:
  - Given there are unread notifications
  - When I open the record screen
  - Then I see a notifications icon with a badge count
  - And tapping it opens the notifications list

## US-RU-12: Side-sheet with previous videos and coach conversations
- As a user, I want quick access to my prior uploads and coach chats.
- Priority: P0
- Acceptance Criteria:
  - Given I am on the record screen (idle)
  - When I tap the side-sheet menu or swipe from the edge
  - Then a side sheet opens listing previous videos (with thumbnails) and past coach conversations
  - And selecting an item navigates to its detail view (video playback or chat thread)


