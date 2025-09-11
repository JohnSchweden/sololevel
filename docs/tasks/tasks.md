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

## US-RU-02: Handle permissions gracefully
Status: In Progress
Priority: P0
Dependencies: Camera and microphone permissions

### User Story
As a user, I want clear prompts for camera permissions.

### Requirements
- Clear permission rationale messaging before requesting camera access
- Native UI modal with "Go to Settings" option when permissions denied
- Disabled UI controls until permissions are granted
- Graceful handling of permission denial states

### Acceptance Criteria
- Given permissions are not granted
- When I open the record screen
- Then I see a native UI modal with Go to Settings option
- And the UI shows disabled controls until permissions granted

### Technical Notes
- **Permission Flow**: `useCameraPermissions` hook with platform-specific implementations
- **Settings Redirect**: `redirectToSettings()` function opens native app settings
- **UI State**: Controls disabled via `disabled` prop when `permission?.granted` is false
- **Rationale Modal**: Currently disabled - relies on native system prompts
- **Cross-platform**: Unified permission handling via `@my/app` package

## US-RU-03: Upload an existing video (MP4/MOV)
Status: Pending
Priority: P0
Dependencies: File system access, video format validation

### User Story
As a user, I want to select a video from my library or filesystem.

### Requirements
- Native media picker integration
- Support for MP4/MOV formats
- File size validation (≤60 seconds)
- Video format and duration validation
- Upload queuing system

### Acceptance Criteria
- Given I tap the Upload icon button
- Then the native popup menu appears with options for library and filesystem (and camera if available)
- And after selecting a local MP4/MOV ≤ 60s
- When I confirm selection
- Then the app validates format and duration
- And the video is queued for upload

### Technical Notes
- **Document Picker**: Use `expo-document-picker` for filesystem access
- **Image Picker**: Use `expo-image-picker` for gallery access
- **Validation**: Check file extension and duration before upload
- **Queue**: Implement upload queue with progress tracking
- **Cross-platform**: Unified file picker interface

## US-RU-04: Background upload with progress and retry
Status: Pending
Priority: P0
Dependencies: Network connectivity, upload service

### User Story
As a user, I want reliable uploads on mobile networks.

### Requirements
- Background upload capability
- Progress tracking with visual feedback
- Automatic retry on network failures
- Upload pause/resume functionality
- Network connectivity monitoring

### Acceptance Criteria
- Given an upload is in progress
- When network fluctuates
- Then I see progress, remaining size, and retry-on-failure
- And uploads resume automatically after connectivity returns
- And I can cancel the upload before completion

### Technical Notes
- **Background**: Use `expo-background-fetch` for background uploads
- **Progress**: Real-time upload progress via Supabase Storage API
- **Retry Logic**: Exponential backoff with network monitoring
- **Queue Management**: FIFO queue with priority handling
- **Storage**: Local cache for failed uploads

## US-RU-05: Secure upload to Supabase Storage (raw)
Status: Pending
Priority: P0
Dependencies: Supabase Storage, authentication

### User Story
As a user, I want my video uploaded securely.

### Requirements
- Secure upload to Supabase Storage
- Signed URL generation
- User-specific storage buckets
- File encryption in transit
- Access control validation

### Acceptance Criteria
- Given a selected/recorded video
- When uploading
- Then the app uses a short-lived signed URL to bucket `raw`
- And on success I receive the storage path for analysis

### Technical Notes
- **Signed URLs**: Generate short-lived URLs via Supabase Edge Functions
- **Bucket**: Upload to `raw` bucket for processing
- **Security**: RLS policies for user-specific access
- **Encryption**: HTTPS for all uploads
- **Validation**: Server-side file validation

## US-RU-06a: Recording states — Idle controls
Status: In Progress
Priority: P0
Dependencies: Camera preview, recording controls

### User Story
As a user, I want clear controls when idle so I know how to start.

### Requirements
- Primary Record button (prominent)
- Upload icon button for existing videos
- Camera Swap button for front/rear toggle
- Live camera preview
- Motion capture overlay (non-blocking)

### Acceptance Criteria
- Given I am on the record screen and no recording is active
- When viewing the controls
- Then I see a primary Record button, an Upload icon button, and Camera Swap
- And the camera preview is running and ready to record
- And a live motion capture overlay with nodes renders on top of the camera view and does not block interaction.

### Technical Notes
- **Controls Layout**: Bottom-aligned control bar
- **Record Button**: Large, prominent circular button
- **Upload Button**: Icon button next to record button
- **Camera Swap**: Icon button for front/rear toggle
- **Preview**: Full-screen camera preview with overlay
- **Pose Detection**: Live motion capture visualization

## US-RU-09a: Camera controls — swap (idle)
Status: Pending
Priority: P0
Dependencies: Camera hardware access

### User Story
As a user, I want to switch between front and back cameras before recording.

### Requirements
- Front/back camera toggle
- Smooth camera transition
- Visual feedback during swap
- State persistence across sessions

### Acceptance Criteria
- Given the camera preview is visible and not recording
- When I tap Camera Swap
- Then the camera toggles between front and back
- And the transition is smooth without interruption

### Technical Notes
- **Hardware**: Access to device camera hardware
- **Transition**: Smooth camera switch without preview interruption
- **State**: Remember last used camera preference
- **Fallback**: Graceful handling if camera unavailable

## US-RU-10: Bottom navigation — Coach / Record / Insights
Status: Pending
Priority: P0
Dependencies: Navigation system, tab routing

### User Story
As a user, I want to switch between core areas quickly using bottom navigation.

### Requirements
- Three-tab bottom navigation
- Coach, Record, Insights tabs
- Active state indication
- Smooth tab transitions
- Persistent navigation state

### Acceptance Criteria
- Given the app is open
- When I view the bottom navigation
- Then I see three tabs: Coach, Record, Insights
- And the Record tab is selected on the recording screen
- And tapping a tab navigates to its respective screen

### Technical Notes
- **Navigation**: Expo Router with tab navigation
- **Tabs**: Coach, Record, Insights (Record as default)
- **Active State**: Visual indication of current tab
- **Transitions**: Smooth screen transitions
- **State Persistence**: Maintain tab state across app sessions

## US-RU-11: Notifications with badge
Status: Pending
Priority: P0
Dependencies: Notification system, badge display

### User Story
As a user, I want to notice new activity at a glance.

### Requirements
- Notification icon with badge
- Unread count display
- Quick access to notifications list
- Real-time badge updates

### Acceptance Criteria
- Given there are unread notifications
- When I open the record screen
- Then I see a notifications icon with a badge count
- And tapping it opens the notifications list

### Technical Notes
- **Badge**: Numeric indicator for unread notifications
- **Real-time**: Live updates via Supabase realtime
- **Navigation**: Direct access to notifications screen
- **Persistence**: Maintain unread state across sessions

## US-RU-12: Side-sheet with previous videos and coach conversations
Status: Pending
Priority: P0
Dependencies: Side sheet navigation, video management

### User Story
As a user, I want quick access to my prior uploads and coach chats.

### Requirements
- Slide-out side sheet menu
- Previous videos list with thumbnails
- Coach conversation history
- Quick navigation to video details
- Search and filter capabilities

### Acceptance Criteria
- Given I am on the record screen (idle)
- When I tap the side-sheet menu or swipe from the edge
- Then a side sheet opens listing previous videos (with thumbnails) and past coach conversations
- And selecting an item navigates to its detail view (video playback or chat thread)

### Technical Notes
- **Side Sheet**: Slide-out navigation menu
- **Videos List**: Thumbnails with metadata
- **Coach History**: Conversation threads with avatars
- **Navigation**: Direct access to video playback and chat
- **Search**: Filter by date, type, or content