# Current Sprint Tasks

- [x] Phase 0 discovery & guardrails for SSML/audio refactor [Backend] [M]
  - Notes: Documented all lingering `audio_url`, `audio_format`, `audio_duration_ms`, and SSML job references across migrations, functions, Edge workers, and client types.
- [x] Phase 1 schema/function cleanup & column normalization [Backend] [L]
  - Notes: Renamed audio columns to `format`/`duration_ms`, rebuilt Supabase RPCs without SSML/audio payloads, aligned API/config types, and updated tests.
- [x] Phase 2 data model simplification & status-driven pipeline [Backend] [L]
  - Notes: Dropped `ssml_jobs`/`audio_jobs`, added retry metadata to `analysis_feedback`, refactored workers/tests for status-based processing.
- [x] Phase 3 edge/client alignment + monitoring rollout [Both] [L]
  - Notes: Updated Zustand store/UI with retry/error metadata, added worker/unit tests, defined monitoring plan for new status fields.

- [x] Phase 4 validation & rollout checklist [Both] [M]


- [x] Post-phase regression audit & documentation cleanup [Both] [S]

## Testing Pipeline
- [x] Supabase migration dry-run covering status metadata and trigger changes
- [x] Edge worker unit tests updated for new status model
- [x] End-to-end analysis run validating per-feedback SSML/audio statuses

## Relevant Files
- `docs/spec/status.md`
- `docs/tasks/action-plan-auto-analysis-ssml-audio.md`
- `supabase/migrations/`
- `supabase/functions/ai-analyze-video/`

