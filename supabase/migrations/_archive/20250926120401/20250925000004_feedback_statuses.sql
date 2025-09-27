-- Migration 04: Add ssml_status and audio_status to analysis_feedback
-- Part of SSML/Audio segments separation initiative
-- Enables tracking of processing status per feedback item

-- Add status columns to analysis_feedback
ALTER TABLE public.analysis_feedback 
ADD COLUMN IF NOT EXISTS ssml_status text 
CHECK (ssml_status IN ('queued','processing','completed','failed')) 
DEFAULT 'queued';

ALTER TABLE public.analysis_feedback 
ADD COLUMN IF NOT EXISTS audio_status text 
CHECK (audio_status IN ('queued','processing','completed','failed')) 
DEFAULT 'queued';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS analysis_feedback_analysis_id_idx 
ON public.analysis_feedback (analysis_id);

CREATE INDEX IF NOT EXISTS analysis_feedback_created_at_idx 
ON public.analysis_feedback (created_at);

CREATE INDEX IF NOT EXISTS analysis_feedback_ssml_status_idx 
ON public.analysis_feedback (ssml_status);

CREATE INDEX IF NOT EXISTS analysis_feedback_audio_status_idx 
ON public.analysis_feedback (audio_status);

-- Update table comment
COMMENT ON TABLE public.analysis_feedback IS 'Individual feedback items with processing status tracking for SSML and audio generation.';
