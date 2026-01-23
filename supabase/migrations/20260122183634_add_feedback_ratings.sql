-- Add user rating columns to analysis_feedback and analyses tables
-- Allows users to rate individual feedback items and overall analysis feedback

-- 1. Add user_rating and user_rating_at to analysis_feedback table
-- Used for rating individual feedback items (thumbs up/down)
ALTER TABLE public.analysis_feedback
  ADD COLUMN user_rating text CHECK (user_rating IN ('up', 'down')) DEFAULT NULL;

ALTER TABLE public.analysis_feedback
  ADD COLUMN user_rating_at timestamptz DEFAULT NULL;

COMMENT ON COLUMN public.analysis_feedback.user_rating IS 'User rating for this feedback item: up (helpful) or down (not helpful)';
COMMENT ON COLUMN public.analysis_feedback.user_rating_at IS 'Timestamp when user rated this feedback item';

-- 2. Add user_rating and user_rating_at to analyses table
-- Used for rating the overall "Brutal Truth" feedback text
ALTER TABLE public.analyses
  ADD COLUMN user_rating text CHECK (user_rating IN ('up', 'down')) DEFAULT NULL;

ALTER TABLE public.analyses
  ADD COLUMN user_rating_at timestamptz DEFAULT NULL;

COMMENT ON COLUMN public.analyses.user_rating IS 'User rating for overall analysis feedback: up (helpful) or down (not helpful)';
COMMENT ON COLUMN public.analyses.user_rating_at IS 'Timestamp when user rated overall analysis feedback';

-- Note: RLS policies are already in place for both tables
-- analysis_feedback: Users can only access feedback for their own analyses (via analysis_id → analyses → analysis_jobs → user_id)
-- analyses: Users can only access analyses for their own jobs (via job_id → analysis_jobs → user_id)
-- No additional RLS policies needed for these columns
