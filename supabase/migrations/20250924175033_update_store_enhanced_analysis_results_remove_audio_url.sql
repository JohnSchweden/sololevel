-- Update store_enhanced_analysis_results function to remove p_audio_url parameter
-- Since we no longer handle job-level audio URLs

CREATE OR REPLACE FUNCTION "public"."store_enhanced_analysis_results"("analysis_job_id" bigint, "p_full_feedback_text" "text" DEFAULT NULL::"text", "p_summary_text" "text" DEFAULT NULL::"text", "p_ssml" "text" DEFAULT NULL::"text", "p_processing_time_ms" bigint DEFAULT NULL::bigint, "p_video_source_type" "text" DEFAULT NULL::"text", "p_feedback" "jsonb" DEFAULT '[]'::"jsonb", "p_metrics" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  -- Update analysis job with enhanced fields (excluding feedback content)
  update public.analysis_jobs
  set
    processing_time_ms = coalesce(p_processing_time_ms, processing_time_ms),
    video_source_type = coalesce(p_video_source_type, video_source_type),
    status = case when p_full_feedback_text is not null then 'completed' else status end,
    processing_completed_at = case when p_full_feedback_text is not null then now() else processing_completed_at end,
    updated_at = now()
  where id = analysis_job_id;

  -- Note: Feedback content is now handled by store_analysis_results() function
  -- that creates records in the analyses table. Audio is handled per-feedback
  -- in analysis_audio_segments table.
end;
$$;
