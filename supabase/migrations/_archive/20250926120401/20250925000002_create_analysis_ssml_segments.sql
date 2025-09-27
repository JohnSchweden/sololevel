-- Migration 02: Create analysis_ssml_segments table
-- Part of SSML/Audio segments separation initiative
-- Stores SSML content per feedback item, separate from audio

-- Create the analysis_ssml_segments table
CREATE TABLE IF NOT EXISTS public.analysis_ssml_segments (
    id bigserial PRIMARY KEY,
    feedback_id bigint NOT NULL REFERENCES public.analysis_feedback(id) ON DELETE CASCADE,
    segment_index int NOT NULL DEFAULT 0,
    ssml text NOT NULL,
    provider text NOT NULL DEFAULT 'gemini',
    version text,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Create unique constraint on feedback_id, segment_index
ALTER TABLE public.analysis_ssml_segments 
ADD CONSTRAINT analysis_ssml_segments_feedback_id_segment_index_key 
UNIQUE (feedback_id, segment_index);

-- Create index on created_at for performance
CREATE INDEX IF NOT EXISTS analysis_ssml_segments_created_at_idx 
ON public.analysis_ssml_segments (created_at);

-- Set table owner
ALTER TABLE public.analysis_ssml_segments OWNER TO postgres;

-- Add RLS policy matching existing patterns
ALTER TABLE public.analysis_ssml_segments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access SSML segments for their own feedback
CREATE POLICY analysis_ssml_segments_user_access ON public.analysis_ssml_segments
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.analysis_feedback af
        JOIN public.analysis_jobs aj ON aj.id = af.analysis_id::text::bigint
        WHERE af.id = analysis_ssml_segments.feedback_id
        AND aj.user_id = auth.uid()
    )
);

-- Add helpful comment
COMMENT ON TABLE public.analysis_ssml_segments IS 'SSML content per feedback item. Separated from audio for independent processing.';
