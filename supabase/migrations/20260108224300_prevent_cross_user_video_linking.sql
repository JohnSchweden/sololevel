-- Migration: Prevent cross-user video linking in analysis_jobs
-- 
-- Problem: analysis_jobs can be created with video_recording_id pointing to
-- a video owned by a different user. This causes access denied errors when
-- the client tries to fetch signed URLs for videos it doesn't own.
--
-- Solution: Update the INSERT policy to validate that the linked video_recording
-- belongs to the same user.

-- Drop the old INSERT policy
DROP POLICY IF EXISTS "Users can insert their own analysis jobs" ON "public"."analysis_jobs";

-- Create new INSERT policy with video ownership check
CREATE POLICY "Users can insert their own analysis jobs" 
ON "public"."analysis_jobs" 
FOR INSERT 
TO "authenticated" 
WITH CHECK (
  -- User must own the analysis_job
  (SELECT auth.uid()) = user_id
  AND
  -- User must also own the linked video_recording
  (
    video_recording_id IS NULL 
    OR 
    EXISTS (
      SELECT 1 FROM public.video_recordings vr 
      WHERE vr.id = video_recording_id 
      AND vr.user_id = (SELECT auth.uid())
    )
  )
);

-- Add a comment explaining the policy
COMMENT ON POLICY "Users can insert their own analysis jobs" ON "public"."analysis_jobs" IS 
'Ensures users can only create analysis jobs for their own videos. Prevents cross-user video linking data integrity issues.';

-- =============================================================================
-- DATA CLEANUP (OPTIONAL)
-- Uncomment to delete existing mismatched records
-- =============================================================================

-- View mismatched records first (dry run)
-- SELECT 
--   aj.id as job_id, 
--   aj.user_id as job_owner, 
--   vr.user_id as video_owner,
--   aj.created_at
-- FROM public.analysis_jobs aj
-- JOIN public.video_recordings vr ON aj.video_recording_id = vr.id
-- WHERE aj.user_id != vr.user_id;

-- Delete mismatched records (uncomment to execute)
-- DELETE FROM public.analysis_jobs
-- WHERE id IN (
--   SELECT aj.id 
--   FROM public.analysis_jobs aj
--   JOIN public.video_recordings vr ON aj.video_recording_id = vr.id
--   WHERE aj.user_id != vr.user_id
-- );
