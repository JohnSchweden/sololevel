-- Fix enhanced analysis function to work with service role
-- The original function required auth.uid() which doesn't work for service role calls

CREATE OR REPLACE FUNCTION public.get_enhanced_analysis_with_feedback(analysis_job_id bigint)
RETURNS TABLE (
  analysis_id bigint,
  status text,
  progress_percentage integer,
  full_report_text text,
  summary_text text,
  ssml text,
  audio_url text,
  processing_time_ms bigint,
  video_source_type text,
  created_at timestamptz,
  updated_at timestamptz,
  feedback jsonb,
  metrics jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Allow service role to bypass RLS, but authenticated users still need to own the analysis
  IF (SELECT auth.role()) = 'service_role' THEN
    RETURN QUERY
    SELECT
      aj.id AS analysis_id,
      aj.status,
      aj.progress_percentage,
      aj.full_report_text,
      aj.summary_text,
      aj.ssml,
      aj.audio_url,
      aj.processing_time_ms,
      aj.video_source_type,
      aj.created_at,
      aj.updated_at,
      COALESCE(
        JSONB_AGG(
          JSONB_BUILD_OBJECT(
            'id', af.id,
            'timestamp', af.timestamp_seconds,
            'category', af.category,
            'message', af.message,
            'confidence', af.confidence,
            'impact', af.impact,
            'created_at', af.created_at
          )
        ) FILTER (WHERE af.id IS NOT NULL),
        '[]'::JSONB
      ) AS feedback,
      COALESCE(
        JSONB_OBJECT_AGG(am.metric_key,
          JSONB_BUILD_OBJECT(
            'value', am.metric_value,
            'unit', am.unit,
            'updated_at', am.updated_at
          )
        ) FILTER (WHERE am.id IS NOT NULL),
        '{}'::JSONB
      ) AS metrics
    FROM public.analysis_jobs aj
    LEFT JOIN public.analysis_feedback af ON af.analysis_id = aj.id
    LEFT JOIN public.analysis_metrics am ON am.analysis_id = aj.id
    WHERE aj.id = analysis_job_id
    GROUP BY aj.id, aj.status, aj.progress_percentage, aj.full_report_text, aj.summary_text,
             aj.ssml, aj.audio_url, aj.processing_time_ms, aj.video_source_type,
             aj.created_at, aj.updated_at;
  ELSE
    -- For authenticated users, enforce ownership
    RETURN QUERY
    SELECT
      aj.id AS analysis_id,
      aj.status,
      aj.progress_percentage,
      aj.full_report_text,
      aj.summary_text,
      aj.ssml,
      aj.audio_url,
      aj.processing_time_ms,
      aj.video_source_type,
      aj.created_at,
      aj.updated_at,
      COALESCE(
        JSONB_AGG(
          JSONB_BUILD_OBJECT(
            'id', af.id,
            'timestamp', af.timestamp_seconds,
            'category', af.category,
            'message', af.message,
            'confidence', af.confidence,
            'impact', af.impact,
            'created_at', af.created_at
          )
        ) FILTER (WHERE af.id IS NOT NULL),
        '[]'::JSONB
      ) AS feedback,
      COALESCE(
        JSONB_OBJECT_AGG(am.metric_key,
          JSONB_BUILD_OBJECT(
            'value', am.metric_value,
            'unit', am.unit,
            'updated_at', am.updated_at
          )
        ) FILTER (WHERE am.id IS NOT NULL),
        '{}'::JSONB
      ) AS metrics
    FROM public.analysis_jobs aj
    LEFT JOIN public.analysis_feedback af ON af.analysis_id = aj.id
    LEFT JOIN public.analysis_metrics am ON am.analysis_id = aj.id
    WHERE aj.id = analysis_job_id
      AND aj.user_id = (SELECT auth.uid())
    GROUP BY aj.id, aj.status, aj.progress_percentage, aj.full_report_text, aj.summary_text,
             aj.ssml, aj.audio_url, aj.processing_time_ms, aj.video_source_type,
             aj.created_at, aj.updated_at;
  END IF;
END;
$$;
