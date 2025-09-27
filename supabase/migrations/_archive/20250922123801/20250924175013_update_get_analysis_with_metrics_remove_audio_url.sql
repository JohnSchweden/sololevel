-- Update get_analysis_with_metrics function to remove audio_url from return type and selection
-- Since we no longer store job-level audio URL

CREATE OR REPLACE FUNCTION "public"."get_analysis_with_metrics"("analysis_job_id" bigint) RETURNS TABLE("analysis_id" bigint, "status" "text", "progress_percentage" integer, "summary_text" "text", "ssml" "text", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "metrics" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  return query
  select
    aj.id as analysis_id,
    aj.status,
    aj.progress_percentage,
    aj.summary_text,
    aj.ssml,
    aj.created_at,
    aj.updated_at,
    coalesce(
      jsonb_object_agg(am.metric_key,
        jsonb_build_object(
          'value', am.metric_value,
          'unit', am.unit,
          'updated_at', am.updated_at
        )
      ) filter (where am.id is not null),
      '{}'::jsonb
    ) as metrics
  from public.analysis_jobs aj
  left join public.analysis_metrics am on am.analysis_id = aj.id
  where aj.id = analysis_job_id
    and aj.user_id = (select auth.uid())
  group by aj.id, aj.status, aj.progress_percentage, aj.summary_text, aj.ssml, aj.created_at, aj.updated_at;
end;
$$;
