-- Add UPDATE policies for user feedback ratings
-- Allows authenticated users to update rating columns on their own feedback

-- 1. Add UPDATE policy for analysis_feedback table
-- Users can update rating columns for feedback items that belong to their analyses
CREATE POLICY "Users can update ratings on their own feedback items"
ON public.analysis_feedback
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM analyses a
    JOIN analysis_jobs aj ON aj.id = a.job_id
    WHERE a.id = analysis_feedback.analysis_id
    AND aj.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM analyses a
    JOIN analysis_jobs aj ON aj.id = a.job_id
    WHERE a.id = analysis_feedback.analysis_id
    AND aj.user_id = auth.uid()
  )
);

-- 2. Add UPDATE policy for analyses table
-- Users can update rating columns for analyses that belong to their jobs
CREATE POLICY "Users can update ratings on their own analyses"
ON public.analyses
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM analysis_jobs aj
    WHERE aj.id = analyses.job_id
    AND aj.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM analysis_jobs aj
    WHERE aj.id = analyses.job_id
    AND aj.user_id = auth.uid()
  )
);

COMMENT ON POLICY "Users can update ratings on their own feedback items" ON public.analysis_feedback IS 
'Allows users to rate (thumbs up/down) individual feedback items that belong to their own analyses';

COMMENT ON POLICY "Users can update ratings on their own analyses" ON public.analyses IS 
'Allows users to rate (thumbs up/down) the overall "Brutal Truth" feedback for their own analyses';
