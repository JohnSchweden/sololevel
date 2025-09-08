# User Stories — Feedback Review & Playback (P0)

References: `../PRD.md`, `../TRD.md`, `../wireflow.png`

## US-FB-01: View AI text summary and key takeaways
- As a user, I want a concise summary I can act on.
- Priority: P0
- Acceptance Criteria:
  - Given analysis is completed
  - When I open the Feedback screen
  - Then I see a summary with 3–5 key bullets and suggested next steps

## US-FB-02: Listen to audio commentary (TTS)
- As a user, I want narrated feedback.
- Priority: P0
- Acceptance Criteria:
  - Given an `audio_url` exists
  - When I press Play
  - Then audio streams with play/pause/seek controls
  - And buffering state is visible

## US-FB-03: Share feedback summary card (basic)
- As a user, I want to share my results.
- Priority: P0
- Acceptance Criteria:
  - Given a completed analysis
  - When I tap Share
  - Then a share sheet opens with a generated image or text summary

## Non-functional
- First feedback paint < 1s after completion event
- Audio start to first sound < 500ms on Wi‑Fi
