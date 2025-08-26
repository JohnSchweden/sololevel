# Record → Feedback Flow – Product Requirements Document (MVP)

## 1. Purpose & Vision
Enable users to record a presentation (video + motion-capture overlay), upload/process it, and receive actionable AI-generated feedback in < 20 s. This feature targets professionals who need rapid, private rehearsal feedback.

## 2. Objectives & Success Metrics
- **Completion-rate**: ≥ 70 % of started recordings reach the feedback screen in one session.
- **Processing SLA**: 95 th percentile ≤ 20 s from upload completion to feedback available.
- **Daily Active Uploaders (DAU-U)**: ≥ 15 % of overall DAU within 30 days of launch.
- **NPS delta**: +10 compared with users who have not used the feature.

## 3. Target Personas
1. **Sales Presenter (Sarah, 34)** – Needs quick rehearsal feedback pre-meeting.
2. **First-time Speaker (Tom, 27)** – Practices public-speaking fundamentals.

## 4. Scope
### In-scope (MVP)
- Camera recording (front/rear, max 90 s, 1080p capped at 200 MB).
- Real-time stick-figure motion overlay.
- Upload to Supabase Storage & trigger Edge Function for AI analysis.
- Processing state UI (progress bar + fun avatar).
- Feedback bottom-sheet with:
  - Timeline scrubber
  - AI textual tips (max 5)
  - Comment reply field (no social share)
- Local video history drawer.

### Out-of-scope / Phase 2
- Social metrics (views, likes, shares).
- Public comments & feed.
- Multi-language transcription.

## 5. User Stories & Acceptance Criteria
| ID | User Story | Acceptance Criteria |
|----|-----------|---------------------|
| REC-01 | As a user I can start a recording from the **Record** tab. | Tapping the red button starts a 3-2-1 countdown and begins capture; motion overlay visible. |
| REC-02 | As a user I can pause, resume, or stop recording. | Controls visible; max 90 s enforced; pause state persists. |
| REC-03 | As a user I can upload an existing video. | Last thumbnail acts as upload entry; only formats mp4/mov accepted. |
| PROC-01 | As a user I see a progress indicator while my video is analyzed. | Progress bar animates; cancel aborts processing and deletes temp file. |
| FDBK-01 | As a user I receive AI feedback with timestamped comments. | Feedback loads within SLA; at least one comment present; UI scrollable. |
| FDBK-02 | As a user I can navigate timeline and see corresponding frame. | Scrubber drag updates video frame < 100 ms. |
| HIST-01 | As a user I can access past recordings via side drawer. | Drawer shows list sorted by date; tapping opens feedback view. |

## 6. Functional Requirements
1. **Recording**
   - Supports front/rear camera toggle.
   - Captures motion keypoints at 30 fps, stored as JSON alongside video.
2. **Upload**
   - Uses resumable multipart; retries up to 3 on network error.
3. **Processing**
   - Edge Function `analyze-video` returns feedback JSON shape `{timedComments: {timeMs, text}[]}`.
4. **Feedback UI**
   - Timeline bar becomes sticky when sheet scrolled.
   - Accessibility: WCAG 2.2 AA contrast + voice-over labels.
5. **Local cache**
   - Store last 10 sessions offline (video + feedback). Evict oldest.

## 7. Non-Functional Requirements
- **Performance**: Initial screen < 1 s TTI on iPhone 12; video FPS ≥ 24.
- **Security**: Upload via signed URL; videos private by default.
- **Analytics**: Log events `record_started`, `upload_complete`, `feedback_shown` with durations.
- **Error-handling**: Typed errors; user-friendly toast & retry (see _error-handling.mdc_).
- **Accessibility**: Full screen reader support; caption for feedback tips.

## 8. Dependencies
- Supabase Storage bucket `videos_user_{uid}` (private).
- Edge Function `analyze-video` (OpenAI + Mediapipe pose).
- Tamagui mobile-screen components.

## 9. Risks & Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Processing > 20 s | Poor UX | Progressive feedback, background push notification |
| Large file upload failures | Blocked flow | Resumable uploads, size cap |
| Pose detection accuracy | Bad advice | Model evaluation, fallback generic tips |

## 10. Analytics & Logging
- **Granular**: Pose keypoints per frame stored 7 days for model re-train.
- **Aggregate**: Retain anonymized metrics 90 days.

## 11. Open Questions
1. Exact copy for tooltips & toasts → UX team.
2. Avatar or plain progress UI during processing? Design.
3. Data retention policy beyond 90 days? Compliance.
