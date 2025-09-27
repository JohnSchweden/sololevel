-- Migration 01: Drop summary audio column from analysis_jobs
-- Part of SSML/Audio segments separation initiative
-- Removes job-level audio_url as we now use per-feedback audio segments

-- Drop the audio_url column if it exists (idempotent)
ALTER TABLE public.analysis_jobs DROP COLUMN IF EXISTS audio_url;

-- Add comment for clarity
COMMENT ON TABLE public.analysis_jobs IS 'Analysis job tracking table. Audio is now stored per-feedback in analysis_audio_segments.';
