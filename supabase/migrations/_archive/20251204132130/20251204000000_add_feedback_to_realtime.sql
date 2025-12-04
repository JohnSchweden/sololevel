-- Add analysis_feedback to realtime publication
-- This enables postgres_changes subscriptions on the table

ALTER PUBLICATION supabase_realtime ADD TABLE public.analysis_feedback;

-- Add index for the filter column used in realtime subscriptions
-- The subscription uses: filter: `analysis_id=eq.${analysisId}`
-- This index already exists (analysis_feedback_analysis_id_idx) but let's ensure it's optimal
-- for the UPDATE operations that trigger realtime events

-- Create a partial index for active feedbacks (not yet completed)
-- This speeds up both subscription filtering and the backfill queries
CREATE INDEX IF NOT EXISTS idx_analysis_feedback_active 
ON public.analysis_feedback (analysis_id, created_at DESC)
WHERE audio_status != 'completed' OR ssml_status != 'completed';

COMMENT ON INDEX idx_analysis_feedback_active IS 
  'Optimizes realtime subscription filtering and backfill queries for active analysis sessions';

