# User Stories — Analysis Job & Progress (P0)

References: `../PRD.md`, `../TRD.md`, `../wireflow.png`

## US-AN-01: Trigger AI analysis
- As a user, I want the app to analyze my uploaded video.
- Priority: P0
- Acceptance Criteria:
  - Given my video has a storage path
  - When I tap Analyze
  - Then the client invokes Edge Function `ai-analyze-video` with the path
  - And receives `{ analysisId }`

## US-AN-02: Show processing status in real-time
- As a user, I want to see analysis progress.
- Priority: P0
- Acceptance Criteria:
  - Given an analysis has started
  - When I view the Progress screen
  - Then I see status: queued → processing → completed|failed
  - And the client receives realtime updates for the `analyses` row

## US-AN-03: Video playback with live processing
- As a user, I want immediate video playback with real-time AI analysis after recording.
- Priority: P0
- Acceptance Criteria:
  - Given I have finished recording a video
  - When the recording stops
  - Then the video is displayed with controls overlay visible
  - And a loading spinner appears temporarily
  - And AI processing begins automatically in the background
  - And the controls overlay disappears automatically when playback starts
  - And I can see live analysis results as they become available during playback.

## US-AN-04: Graceful failure and retry
- As a user, I want clear errors and retry options.
- Priority: P0
- Acceptance Criteria:
  - Given the analysis fails (provider/network)
  - When failure occurs
  - Then I see a readable error and a Retry button
  - And retry reuses the existing video path

## US-AN-05: Cancel analysis
- As a user, I can cancel an in-progress analysis.
- Priority: P0
- Acceptance Criteria:
  - Given analysis is queued or processing
  - When I tap Cancel
  - Then the job stops and status becomes `failed|cancelled`

## Performance Targets
- End-to-end feedback median < 10s for 60s clip
- Queue time p95 < 2s; function cold-start mitigated
