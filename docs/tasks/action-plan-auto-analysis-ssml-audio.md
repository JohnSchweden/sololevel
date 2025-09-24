### Auto Analysis + SSML/Audio Segments Action Plan

Purpose: Backend-driven, reliable kickoff of video analysis and per-feedback SSML/audio generation. Remove summary-level audio, split SSML and audio into separate segment tables, add queues and triggers, and wire Edge Functions accordingly.

---

### Goals
- Analysis starts automatically when a video upload finishes (no client call).
- SSML is generated per feedback item; audio is generated from SSML.
- No summary-level audio; artifacts are per-feedback segments only.
- All work is queued, idempotent, and observable with statuses.

---

### High-level Changes
- Remove `analysis_jobs.audio_url` and any summary-audio usage.
- Create `analysis_ssml_segments` table (new) for SSML per feedback segment.
- Keep `analysis_audio_segments` for audio per feedback segment, but remove any SSML fields from it.
- Add `ssml_status` and `audio_status` to `analysis_feedback` for UI state.
- Add job tables: `ssml_jobs`, `audio_jobs` with UNIQUE(feedback_id) and retry metadata.
- Prefer DB status flip → webhook/worker for analysis kickoff (faster than storage webhooks).
- Edge Functions stream/download with service role; no signed URLs server-side.

---

### Database Migrations (create in order)
1) 20250924_01_drop_summary_audio.sql
- `alter table analysis_jobs drop column if exists audio_url;`

2) 20250924_02_create_analysis_ssml_segments.sql
- Create table:
  - `id bigserial primary key`
  - `feedback_id bigint not null references analysis_feedback(id) on delete cascade`
  - `segment_index int not null default 0`
  - `ssml text not null`
  - `provider text not null default 'gemini'`
  - `version text`
  - `created_at timestamptz not null default now()`
- Constraints/Indexes:
  - `unique(feedback_id, segment_index)`
  - index on `(created_at)`

3) 20250924_03_update_analysis_audio_segments.sql
- Remove SSML-related columns from `analysis_audio_segments` (keep only audio-specific):
  - Required columns: `id`, `feedback_id`, `segment_index`, `audio_url`, `format`, `duration_ms`, `provider`, `version`, `created_at`
- Add/ensure `unique(feedback_id, segment_index)`

4) 20250924_04_feedback_statuses.sql
- Add statuses to `analysis_feedback`:
  - `ssml_status text check (ssml_status in ('queued','processing','completed','failed')) default 'queued'`
  - `audio_status text check (audio_status in ('queued','processing','completed','failed')) default 'queued'`
- Indexes: `(analysis_job_id)`, `(created_at)`

5) 20250924_05_create_ssml_jobs.sql
- `ssml_jobs`:
  - `id bigserial primary key`
  - `feedback_id bigint not null references analysis_feedback(id) on delete cascade`
  - `status text not null default 'queued'`
  - `attempts int not null default 0`
  - `last_error text`
  - `created_at timestamptz not null default now()`
  - `unique(feedback_id)`

6) 20250924_06_create_audio_jobs.sql
- `audio_jobs` with the same shape as `ssml_jobs` and `unique(feedback_id)`

7) 20250924_07_triggers_feedback_enqueue_ssml.sql
- AFTER INSERT on `analysis_feedback`:
  - WHEN `trim(coalesce(NEW.message,'')) <> ''`
  - INSERT INTO `ssml_jobs(feedback_id)` VALUES (NEW.id) ON CONFLICT DO NOTHING
  - `update analysis_feedback set ssml_status='queued' where id=NEW.id;`
- (Optional) AFTER UPDATE to requeue when `message` changes to non-empty

8) 20250924_08_trigger_analysis_kickoff.sql (if not present yet)
- When `video_recordings.upload_status` flips to `completed`, enqueue or upsert `analysis_jobs` (status='queued'). Prefer a DB webhook → Edge Function over calling HTTP inside the trigger.

---

### Edge Functions Updates (supabase/functions)
- ai-analyze-video/routes/handleStartAnalysis.ts
  - Accept `{ videoRecordingId }` in addition to `{ videoPath }`.
  - Lookup `video_recordings`, derive `storage_path`, ensure `analysis_jobs` (idempotent), set status transitions.
  - Stream/download video directly using service role (no signed URLs).

- ai-analyze-video/gemini-ssml-feedback.ts
  - Dequeue from `ssml_jobs` (FOR UPDATE SKIP LOCKED), set `ssml_status='processing'`.
  - Generate SSML (segment if needed) and write rows into `analysis_ssml_segments`.
  - Set `analysis_feedback.ssml_status='completed'` or `'failed'` (with `attempts++`, `last_error`).
  - Enqueue `audio_jobs(feedback_id)` on success.

- ai-analyze-video/gemini-tts-audio.ts
  - Dequeue from `audio_jobs`, set `audio_status='processing'`.
  - Read `analysis_ssml_segments` for the `feedback_id`.
  - Generate audio per segment; upload to `processed/` via service role.
  - Write `analysis_audio_segments` rows; set `analysis_feedback.audio_status='completed'` (or `'failed'`).

---

### Permissions & Performance
- Storage access in Edge: service-role streaming (no signed URL generation server-side).
- RLS stays enabled on all public tables; workers use service client.
- Add the indexes/uniques above for fast lookups and idempotency.

---

### Client/UI Impact
- Remove any UI dependency on `analysis_jobs.audio_url` (summary audio is gone).
- Subscribe to `analysis_feedback.ssml_status` and `audio_status` for per-item readiness.
- Keep auto-navigation and progress UI; analysis kickoff is backend-driven.

---

### Testing Plan
- DB tests (supabase/tests/database):
  - Feedback insert with message → `ssml_jobs` enqueued; statuses flow (mock worker).
  - SSML segments written → `audio_jobs` enqueued → audio segments written; statuses complete.
  - Uniqueness/idempotency on all job tables.
- Edge unit tests (Vitest in functions):
  - handleStartAnalysis with `{ videoRecordingId }` path.
  - SSML worker: segments persisted + enqueues audio.
  - Audio worker: segments → audio files → segment rows → status updates.
- E2E: feedback shows audio only after both statuses are `completed`.

---

### Rollout Steps
1) Ship migrations 01–08 to staging.
2) Update `handleStartAnalysis.ts` to support `videoRecordingId` path.
3) Implement/enhance SSML and Audio workers as above.
4) Remove any summary audio references in code and UI.
5) Verify pipeline on staging with a full upload → analysis → feedback → SSML → audio flow.
6) Enable on production.

---

### Notes
- Keep job workers idempotent and short-lived; use `FOR UPDATE SKIP LOCKED` + backoff with capped retries.
- Prefer queue tables + worker pull over triggers making HTTP calls.
- Optional: use a single `worker_jobs(job_type, feedback_id, …)` if you want one generic queue; the plan above uses two explicit tables for clarity.


