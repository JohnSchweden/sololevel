-- Migration 09: Fix function conflicts for SSML/Audio separation
-- Drop and recreate functions that have return type conflicts

-- Drop existing functions that need return type changes
DROP FUNCTION IF EXISTS public.get_analysis_with_metrics(bigint);
DROP FUNCTION IF EXISTS public.store_analysis_results(bigint, text, jsonb);
DROP FUNCTION IF EXISTS public.store_analysis_results(bigint, text, text, text, jsonb);
DROP FUNCTION IF EXISTS public.store_analysis_results(bigint, text, text, text, jsonb, text);
DROP FUNCTION IF EXISTS public.store_enhanced_analysis_results(bigint, text, text, text, text, jsonb, jsonb);
DROP FUNCTION IF EXISTS public.store_enhanced_analysis_results(bigint, text, text, text, text, jsonb, jsonb, text, jsonb);
DROP FUNCTION IF EXISTS public.store_analysis_audio_segment(uuid, text, text, integer, text, text, text);
DROP FUNCTION IF EXISTS public.store_analysis_audio_segment_for_feedback(uuid, bigint, text, text, integer, text, text, text);
DROP FUNCTION IF EXISTS public.store_audio_segment(bigint, text, integer, text, text, text);
DROP FUNCTION IF EXISTS public.store_enhanced_analysis_results(bigint, text, text, bigint, text, jsonb, jsonb);
DROP FUNCTION IF EXISTS public.get_audio_segments_for_feedback(bigint);
DROP FUNCTION IF EXISTS public.store_audio_segment(bigint, text, text, integer, text);
DROP FUNCTION IF EXISTS public.store_analysis_audio_segment(uuid, text, text, integer, text, text, text);

CREATE OR REPLACE FUNCTION public.get_analysis_with_metrics(analysis_job_id bigint)
RETURNS TABLE(
    analysis_id bigint,
    status text,
    progress_percentage integer,
    summary_text text,
    created_at timestamptz,
    updated_at timestamptz,
    metrics jsonb
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    aj.id as analysis_id,
    aj.status,
    aj.progress_percentage,
    aj.summary_text,
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
  FROM public.analysis_jobs aj
  LEFT JOIN public.analysis_metrics am ON am.analysis_id = aj.id
  WHERE aj.id = analysis_job_id
    AND aj.user_id = (SELECT auth.uid())
  GROUP BY aj.id, aj.status, aj.progress_percentage, aj.summary_text, aj.created_at, aj.updated_at;
END;
$$;

CREATE OR REPLACE FUNCTION public.store_analysis_results(
    analysis_job_id bigint,
    p_summary_text text DEFAULT NULL,
    p_metrics jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  metric_record record;
BEGIN
  UPDATE public.analysis_jobs
  SET
    summary_text = coalesce(p_summary_text, summary_text),
    status = CASE WHEN p_summary_text IS NOT NULL THEN 'completed' ELSE status END,
    processing_completed_at = CASE WHEN p_summary_text IS NOT NULL THEN now() ELSE processing_completed_at END,
    updated_at = now()
  WHERE id = analysis_job_id;

  IF p_metrics != '{}'::jsonb THEN
    FOR metric_record IN
      SELECT
        key as metric_key,
        CASE
          WHEN jsonb_typeof(value) = 'number' THEN (value::text)::numeric
          WHEN jsonb_typeof(value) = 'string' AND value::text ~ '^[0-9]+\.?[0-9]*$' THEN (value::text)::numeric
          ELSE 0
        END as metric_value,
        CASE
          WHEN key LIKE '%_percentage' OR key LIKE '%_score' THEN 'percentage'
          WHEN key LIKE '%_time' OR key LIKE '%_duration' THEN 'seconds'
          WHEN key LIKE '%_angle' THEN 'degrees'
          WHEN key LIKE '%_distance' THEN 'pixels'
          ELSE 'count'
        END as unit
      FROM jsonb_each(p_metrics)
      WHERE jsonb_typeof(value) IN ('number', 'string')
        AND (jsonb_typeof(value) = 'number' OR value::text ~ '^[0-9]+\.?[0-9]*$')
    LOOP
      INSERT INTO public.analysis_metrics (analysis_id, metric_key, metric_value, unit)
      VALUES (analysis_job_id, metric_record.metric_key, metric_record.metric_value, metric_record.unit)
      ON CONFLICT (analysis_id, metric_key) DO UPDATE SET
        metric_value = excluded.metric_value,
        unit = excluded.unit,
        updated_at = now();
    END LOOP;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.store_enhanced_analysis_results(
    analysis_job_id bigint,
    p_full_feedback_text text DEFAULT NULL,
    p_summary_text text DEFAULT NULL,
    p_processing_time_ms bigint DEFAULT NULL,
    p_video_source_type text DEFAULT NULL,
    p_feedback jsonb DEFAULT '[]'::jsonb,
    p_metrics jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.analysis_jobs
  SET
    full_feedback_text = coalesce(p_full_feedback_text, full_feedback_text),
    summary_text = coalesce(p_summary_text, summary_text),
    processing_time_ms = coalesce(p_processing_time_ms, processing_time_ms),
    video_source_type = coalesce(p_video_source_type, video_source_type),
    status = CASE WHEN p_full_feedback_text IS NOT NULL OR p_summary_text IS NOT NULL THEN 'completed' ELSE status END,
    processing_completed_at = CASE
      WHEN p_full_feedback_text IS NOT NULL OR p_summary_text IS NOT NULL THEN now()
      ELSE processing_completed_at
    END,
    updated_at = now()
  WHERE id = analysis_job_id;

  PERFORM public.store_analysis_results(analysis_job_id, p_summary_text, p_metrics);

  IF p_feedback IS NOT NULL AND jsonb_typeof(p_feedback) = 'array' THEN
    INSERT INTO public.analysis_feedback (
      analysis_job_id,
      timestamp_seconds,
      category,
      message,
      confidence,
      impact,
      created_at
    )
    SELECT
      analysis_job_id,
      (item->>'timestamp_seconds')::numeric,
      item->>'category',
      item->>'message',
      (item->>'confidence')::numeric,
      (item->>'impact')::numeric,
      now()
    FROM jsonb_array_elements(p_feedback) AS item
    ON CONFLICT (analysis_job_id, timestamp_seconds, message)
    DO UPDATE SET
      category = excluded.category,
      confidence = excluded.confidence,
      impact = excluded.impact,
      updated_at = now();
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_audio_segments_for_feedback(feedback_item_id bigint)
RETURNS TABLE(
    id bigint,
    audio_url text,
    duration_ms integer,
    format text,
    provider text,
    version text,
    created_at timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    aas.id,
    aas.audio_url,
    aas.duration_ms,
    aas.format,
    aas.provider,
    aas.version,
    aas.created_at
  FROM public.analysis_audio_segments aas
  JOIN public.analysis_feedback af ON af.id = aas.analysis_feedback_id
  WHERE aas.analysis_feedback_id = feedback_item_id
    AND af.analysis_job_id IN (
      SELECT id FROM public.analysis_jobs WHERE user_id = (SELECT auth.uid())
    )
  ORDER BY aas.segment_index;
END;
$$;

CREATE OR REPLACE FUNCTION public.store_audio_segment(
    p_analysis_feedback_id bigint,
    p_audio_url text,
    p_duration_ms integer DEFAULT NULL,
    p_format text DEFAULT 'aac',
    p_provider text DEFAULT 'gemini',
    p_version text DEFAULT NULL
)
RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  segment_id bigint;
BEGIN
  IF p_analysis_feedback_id IS NULL OR p_audio_url IS NULL THEN
    RAISE EXCEPTION 'analysis_feedback_id and audio_url are required';
  END IF;

  INSERT INTO public.analysis_audio_segments (
    analysis_feedback_id,
    segment_index,
    audio_url,
    duration_ms,
    format,
    provider,
    version,
    created_at
  ) VALUES (
    p_analysis_feedback_id,
    COALESCE(
      (SELECT COALESCE(MAX(segment_index) + 1, 0) FROM public.analysis_audio_segments WHERE analysis_feedback_id = p_analysis_feedback_id),
      0
    ),
    p_audio_url,
    p_duration_ms,
    p_format,
    p_provider,
    p_version,
    now()
  )
  RETURNING id INTO segment_id;

  RETURN segment_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.store_analysis_audio_segment(
    p_analysis_id uuid,
    p_feedback_id bigint,
    p_audio_url text,
    p_duration_ms integer DEFAULT NULL,
    p_format text DEFAULT 'aac',
    p_provider text DEFAULT 'gemini',
    p_version text DEFAULT NULL
)
RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  segment_id bigint;
BEGIN
  IF p_analysis_id IS NULL OR p_feedback_id IS NULL OR p_audio_url IS NULL THEN
    RAISE EXCEPTION 'analysis_id, feedback_id, and audio_url are required';
  END IF;

  INSERT INTO public.analysis_audio_segments (
    analysis_feedback_id,
    segment_index,
    audio_url,
    duration_ms,
    format,
    provider,
    version,
    created_at
  ) VALUES (
    p_feedback_id,
    COALESCE(
      (SELECT COALESCE(MAX(segment_index) + 1, 0) FROM public.analysis_audio_segments WHERE analysis_feedback_id = p_feedback_id),
      0
    ),
    p_audio_url,
    p_duration_ms,
    p_format,
    p_provider,
    p_version,
    now()
  )
  RETURNING id INTO segment_id;

  RETURN segment_id;
END;
$$;
