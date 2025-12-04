-- Fix function_search_path_mutable warnings
-- Sets search_path = '' on all public functions to prevent search path injection attacks
-- Ref: https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable

-- Fix auth_rls_initplan warning for analysis_ssml_segments
-- Wrap auth.uid() in (select ...) so it's evaluated once per query, not per row
-- Ref: https://supabase.com/docs/guides/database/database-linter?lint=0003_auth_rls_initplan
DROP POLICY IF EXISTS "analysis_ssml_segments_user_access" ON "public"."analysis_ssml_segments";
CREATE POLICY "analysis_ssml_segments_user_access" ON "public"."analysis_ssml_segments"
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.analysis_feedback af
    JOIN public.analysis_jobs aj ON aj.id = af.analysis_id::text::bigint
    WHERE af.id = analysis_ssml_segments.feedback_id
      AND aj.user_id = (SELECT auth.uid())
  )
);

-- Functions with no arguments
ALTER FUNCTION public.backfill_analyses_from_jobs() SET search_path = '';
ALTER FUNCTION public.cleanup_expired_upload_sessions() SET search_path = '';
ALTER FUNCTION public.create_analysis_job_on_upload_complete() SET search_path = '';
ALTER FUNCTION public.enforce_processed_mime_whitelist() SET search_path = '';
ALTER FUNCTION public.enforce_video_mime_whitelist() SET search_path = '';
ALTER FUNCTION public.enqueue_analysis_job_on_upload_complete() SET search_path = '';
ALTER FUNCTION public.finalize_video_on_raw_object() SET search_path = '';
ALTER FUNCTION public.handle_new_user() SET search_path = '';
ALTER FUNCTION public.handle_updated_at() SET search_path = '';
ALTER FUNCTION public.migrate_results_to_metrics() SET search_path = '';
ALTER FUNCTION public.reset_feedback_generation_state() SET search_path = '';

-- Functions with bigint argument
ALTER FUNCTION public.get_analysis_with_metrics(bigint) SET search_path = '';
ALTER FUNCTION public.get_audio_segments_for_feedback(bigint) SET search_path = '';
ALTER FUNCTION public.get_complete_analysis(bigint) SET search_path = '';
ALTER FUNCTION public.get_enhanced_analysis_with_feedback(bigint) SET search_path = '';
ALTER FUNCTION public.get_feedback_with_audio(bigint) SET search_path = '';
ALTER FUNCTION public.get_upload_progress(bigint) SET search_path = '';
ALTER FUNCTION public.webhook_analysis_kickoff(bigint) SET search_path = '';

-- Functions with complex signatures (actual current signatures from database)
ALTER FUNCTION public.store_analysis_audio_segment(uuid, bigint, text, numeric, text, text, text) SET search_path = '';
ALTER FUNCTION public.store_analysis_results(bigint, text, text, text, jsonb, text, text) SET search_path = '';
ALTER FUNCTION public.store_audio_segment(bigint, text, numeric, text, text, text) SET search_path = '';

