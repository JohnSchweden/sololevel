-- Migration: Add ssml_prompt to analysis_ssml_segments
-- Purpose: Persist the prompt used for SSML generation per segment

-- Safe add: add column if not exists
ALTER TABLE public.analysis_ssml_segments
  ADD COLUMN IF NOT EXISTS ssml_prompt text;

COMMENT ON COLUMN public.analysis_ssml_segments.ssml_prompt IS 'Prompt used to generate the SSML for this segment';

-- Ensure RLS/grants remain intact (table already has RLS policies); re-grant for service roles
GRANT ALL ON TABLE public.analysis_ssml_segments TO service_role;
