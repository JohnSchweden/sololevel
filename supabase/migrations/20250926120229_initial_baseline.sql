

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."backfill_analyses_from_jobs"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  analysis_record record;
begin
  -- Insert analyses rows for existing analysis_jobs that have feedback content
  for analysis_record in
    select
      id as job_id,
      full_feedback_text,
      summary_text,
      ssml
    from public.analysis_jobs
    where full_feedback_text is not null or summary_text is not null
       or ssml is not null
  loop
    -- Insert into analyses table
    insert into public.analyses (
      job_id,
      full_feedback_text,
      summary_text
    ) values (
      analysis_record.job_id,
      analysis_record.full_feedback_text,
      analysis_record.summary_text
    );

    -- Note: Audio segments are handled separately by per-feedback audio
    -- No job-level audio to migrate since we're removing that concept
  end loop;

  -- Update existing analysis_feedback records to reference analyses instead of jobs
  update public.analysis_feedback
  set analysis_id = a.id::text::uuid
  from public.analyses a
  where analysis_feedback.analysis_id::text::bigint = a.job_id;

  -- Update analysis_audio_segments to reference the new analyses (if they exist)
  update public.analysis_audio_segments
  set analysis_id = a.id
  from public.analyses a
  where a.job_id = (
    select af.analysis_id::text::bigint
    from public.analysis_feedback af
    where af.id = analysis_audio_segments.analysis_feedback_id
    limit 1
  );

end;
$$;


ALTER FUNCTION "public"."backfill_analyses_from_jobs"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."backfill_analyses_from_jobs"() IS 'Backfill analyses table from existing analysis_jobs data and update audio segments';



CREATE OR REPLACE FUNCTION "public"."cleanup_expired_upload_sessions"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  update public.upload_sessions
  set status = 'expired'
  where expires_at < now() and status = 'active';
end;
$$;


ALTER FUNCTION "public"."cleanup_expired_upload_sessions"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_analysis_job_on_upload_complete"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  -- Only create analysis job when upload status changes to 'completed'
  if old.upload_status != 'completed' and new.upload_status = 'completed' then
    insert into public.analysis_jobs (user_id, video_recording_id)
    values (new.user_id, new.id);
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."create_analysis_job_on_upload_complete"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_processed_mime_whitelist"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $_$
DECLARE
  ext text := lower(regexp_replace(new.name, '.*(\.[^.]+)$', '\1'));
  mime text := lower(coalesce(new.metadata->>'mimetype',''));
  inferred_mime text;
BEGIN
  -- Only enforce for processed bucket
  IF new.bucket_id = 'processed' THEN
    -- Check file extension (for now, only audio files)
    IF ext NOT IN ('.mp3', '.wav') THEN
      RAISE EXCEPTION 'processed bucket currently only accepts .mp3 or .wav files';
    END IF;

    -- Infer MIME type from file extension since metadata might not be set correctly
    CASE ext
      WHEN '.wav' THEN inferred_mime := 'audio/wav';
      WHEN '.mp3' THEN inferred_mime := 'audio/mpeg';
      ELSE inferred_mime := 'application/octet-stream';
    END CASE;

    -- Set the mimetype in metadata if it's not already set
    IF mime = '' THEN
      new.metadata := jsonb_set(coalesce(new.metadata, '{}'), '{mimetype}', to_jsonb(inferred_mime));
      RAISE NOTICE 'Set mimetype in metadata for %: %', new.name, inferred_mime;
    END IF;

    -- Now check the MIME type (either original or inferred)
    mime := lower(coalesce(new.metadata->>'mimetype', ''));
    IF mime NOT IN ('audio/mpeg','audio/wav','audio/x-wav','audio/wave') THEN
      RAISE EXCEPTION 'processed bucket currently only accepts audio mimetypes (got: %)', mime;
    END IF;
  END IF;

  RETURN new;
END $_$;


ALTER FUNCTION "public"."enforce_processed_mime_whitelist"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enforce_video_mime_whitelist"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $_$
DECLARE
  ext text := lower(regexp_replace(new.name, '.*(\.[^.]+)$', '\1'));
  mime text := lower(coalesce(new.metadata->>'mimetype',''));
  inferred_mime text;
BEGIN
  -- Only enforce for raw bucket
  IF new.bucket_id = 'raw' THEN
    -- Check file extension
    IF ext NOT IN ('.mp4', '.mov') THEN
      RAISE EXCEPTION 'raw bucket only accepts .mp4 or .mov files';
    END IF;

    -- Infer MIME type from file extension since metadata might not be set correctly
    CASE ext
      WHEN '.mp4' THEN inferred_mime := 'video/mp4';
      WHEN '.mov' THEN inferred_mime := 'video/quicktime';
      ELSE inferred_mime := 'application/octet-stream';
    END CASE;

    -- Set the mimetype in metadata if it's not already set
    IF mime = '' THEN
      new.metadata := jsonb_set(coalesce(new.metadata, '{}'), '{mimetype}', to_jsonb(inferred_mime));
      RAISE NOTICE 'Set mimetype in metadata for %: %', new.name, inferred_mime;
    END IF;

    -- Now check the MIME type (either original or inferred)
    mime := lower(coalesce(new.metadata->>'mimetype', ''));
    IF mime NOT IN ('video/mp4','video/quicktime') THEN
      RAISE EXCEPTION 'raw bucket only accepts video/mp4 or video/quicktime mimetypes (got: %)', mime;
    END IF;
  END IF;

  RETURN new;
END $_$;


ALTER FUNCTION "public"."enforce_video_mime_whitelist"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."enqueue_analysis_job_on_upload_complete"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Only process when upload_status changes to 'completed'
    IF OLD.upload_status IS DISTINCT FROM NEW.upload_status 
       AND NEW.upload_status = 'completed' THEN
        
        -- Enqueue or upsert analysis job
        INSERT INTO public.analysis_jobs (
            user_id,
            video_recording_id,
            status,
            created_at
        ) VALUES (
            NEW.user_id,
            NEW.id,
            'queued',
            now()
        )
        ON CONFLICT (video_recording_id) DO UPDATE SET
            status = 'queued',
            updated_at = now()
        WHERE analysis_jobs.status IN ('failed', 'cancelled');
        
        -- Note: We prefer DB webhook → Edge Function over HTTP calls from triggers
        -- The actual analysis processing will be handled by Edge Functions
        -- This trigger just ensures the job record exists
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."enqueue_analysis_job_on_upload_complete"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."enqueue_analysis_job_on_upload_complete"() IS 'Automatically enqueues analysis job when video upload completes';



CREATE OR REPLACE FUNCTION "public"."get_analysis_with_metrics"("analysis_job_id" bigint) RETURNS TABLE("analysis_id" bigint, "status" "text", "progress_percentage" integer, "summary_text" "text", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "metrics" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
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


ALTER FUNCTION "public"."get_analysis_with_metrics"("analysis_job_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_audio_segments_for_feedback"("feedback_item_id" bigint) RETURNS TABLE("id" bigint, "audio_url" "text", "duration_ms" integer, "format" "text", "provider" "text", "version" "text", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
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


ALTER FUNCTION "public"."get_audio_segments_for_feedback"("feedback_item_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_complete_analysis"("p_job_id" bigint) RETURNS TABLE("analysis_id" "uuid", "job_status" "text", "job_progress_percentage" integer, "full_feedback_text" "text", "summary_text" "text", "raw_generated_text" "text", "full_feedback_json" "jsonb", "feedback_prompt" "text", "audio_segments" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  return query
  select
    a.id as analysis_id,
    aj.status as job_status,
    aj.progress_percentage as job_progress_percentage,
    a.full_feedback_text,
    a.summary_text,
    a.raw_generated_text,
    a.full_feedback_json,
    a.feedback_prompt,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', aas.id,
          'feedback_ssml', aas.feedback_ssml,
          'feedback_audio_url', aas.feedback_audio_url,
          'audio_duration_ms', aas.audio_duration_ms,
          'audio_format', aas.audio_format,
          'ssml_prompt', aas.ssml_prompt,
          'audio_prompt', aas.audio_prompt,
          'created_at', aas.created_at
        )
      ) filter (where aas.id is not null),
      '[]'::jsonb
    ) as audio_segments
  from public.analysis_jobs aj
  left join public.analyses a on a.job_id = aj.id
  left join public.analysis_audio_segments aas on aas.analysis_id = a.id
  where aj.id = p_job_id
    and aj.user_id = (select auth.uid())
  group by a.id, aj.status, aj.progress_percentage, a.full_feedback_text, a.summary_text,
           a.raw_generated_text, a.full_feedback_json, a.feedback_prompt;
end;
$$;


ALTER FUNCTION "public"."get_complete_analysis"("p_job_id" bigint) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_complete_analysis"("p_job_id" bigint) IS 'Get complete analysis data including feedback content and audio segments';



CREATE OR REPLACE FUNCTION "public"."get_enhanced_analysis_with_feedback"("analysis_job_id" bigint) RETURNS TABLE("analysis_id" bigint, "status" "text", "progress_percentage" integer, "processing_time_ms" bigint, "video_source_type" "text", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "feedback" "jsonb", "metrics" "jsonb", "analyses" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  -- Allow service role to bypass RLS, but authenticated users still need to own the analysis
  if (select auth.role()) = 'service_role' then
    return query
    select
      aj.id as analysis_id,
      aj.status,
      aj.progress_percentage,
      aj.processing_time_ms,
      aj.video_source_type,
      aj.created_at,
      aj.updated_at,
      coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id', af.id,
            'analysis_id', af.analysis_id,
            'timestamp', af.timestamp_seconds,
            'category', af.category,
            'message', af.message,
            'confidence', af.confidence,
            'impact', af.impact,
            'created_at', af.created_at
          )
        ) filter (where af.id is not null),
        '[]'::jsonb
      ) as feedback,
      coalesce(
        jsonb_object_agg(am.metric_key,
          jsonb_build_object(
            'value', am.metric_value,
            'unit', am.unit,
            'updated_at', am.updated_at
          )
        ) filter (where am.id is not null),
        '{}'::jsonb
      ) as metrics,
      coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id', a.id,
            'full_feedback_text', a.full_feedback_text,
            'summary_text', a.summary_text,
            'raw_generated_text', a.raw_generated_text,
            'full_feedback_json', a.full_feedback_json,
            'feedback_prompt', a.feedback_prompt,
            'created_at', a.created_at,
            'updated_at', a.updated_at
          )
        ) filter (where a.id is not null),
        '[]'::jsonb
      ) as analyses
    from public.analysis_jobs aj
    left join public.analyses a on a.job_id = aj.id
    left join public.analysis_feedback af on af.analysis_id = a.id
    left join public.analysis_metrics am on am.analysis_id = aj.id
    where aj.id = analysis_job_id
    group by aj.id, aj.status, aj.progress_percentage, aj.processing_time_ms, aj.video_source_type,
             aj.created_at, aj.updated_at;
  else
    -- For authenticated users, enforce ownership
    return query
    select
      aj.id as analysis_id,
      aj.status,
      aj.progress_percentage,
      aj.processing_time_ms,
      aj.video_source_type,
      aj.created_at,
      aj.updated_at,
      coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id', af.id,
            'analysis_id', af.analysis_id,
            'timestamp', af.timestamp_seconds,
            'category', af.category,
            'message', af.message,
            'confidence', af.confidence,
            'impact', af.impact,
            'created_at', af.created_at
          )
        ) filter (where af.id is not null),
        '[]'::jsonb
      ) as feedback,
      coalesce(
        jsonb_object_agg(am.metric_key,
          jsonb_build_object(
            'value', am.metric_value,
            'unit', am.unit,
            'updated_at', am.updated_at
          )
        ) filter (where am.id is not null),
        '{}'::jsonb
      ) as metrics,
      coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id', a.id,
            'full_feedback_text', a.full_feedback_text,
            'summary_text', a.summary_text,
            'raw_generated_text', a.raw_generated_text,
            'full_feedback_json', a.full_feedback_json,
            'feedback_prompt', a.feedback_prompt,
            'created_at', a.created_at,
            'updated_at', a.updated_at
          )
        ) filter (where a.id is not null),
        '[]'::jsonb
      ) as analyses
    from public.analysis_jobs aj
    left join public.analyses a on a.job_id = aj.id
    left join public.analysis_feedback af on af.analysis_id = a.id
    left join public.analysis_metrics am on am.analysis_id = aj.id
    where aj.id = analysis_job_id
      and aj.user_id = (select auth.uid())
    group by aj.id, aj.status, aj.progress_percentage, aj.processing_time_ms, aj.video_source_type,
             aj.created_at, aj.updated_at;
  end if;
end;
$$;


ALTER FUNCTION "public"."get_enhanced_analysis_with_feedback"("analysis_job_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_feedback_with_audio"("analysis_job_id" bigint) RETURNS TABLE("feedback_id" bigint, "analysis_id" bigint, "timestamp_seconds" numeric, "category" "text", "message" "text", "confidence" numeric, "impact" numeric, "feedback_created_at" timestamp with time zone, "audio_segments" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  return query
  select
    af.id as feedback_id,
    af.analysis_id,
    af.timestamp_seconds,
    af.category,
    af.message,
    af.confidence,
    af.impact,
    af.created_at as feedback_created_at,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', aas.id,
          'ssml', aas.ssml,
          'audio_url', aas.audio_url,
          'audio_duration_ms', aas.audio_duration_ms,
          'audio_format', aas.audio_format,
          'created_at', aas.created_at
        )
      ) filter (where aas.id is not null),
      '[]'::jsonb
    ) as audio_segments
  from public.analysis_feedback af
  join public.analysis_jobs aj on aj.id = af.analysis_id
  left join public.analysis_audio_segments aas on aas.analysis_feedback_id = af.id
  where aj.id = analysis_job_id
    and aj.user_id = (select auth.uid())
  group by af.id, af.analysis_id, af.timestamp_seconds, af.category, af.message,
           af.confidence, af.impact, af.created_at
  order by af.timestamp_seconds;
end;
$$;


ALTER FUNCTION "public"."get_feedback_with_audio"("analysis_job_id" bigint) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_feedback_with_audio"("analysis_job_id" bigint) IS 'Get feedback items with their associated audio segments for an analysis job';



CREATE OR REPLACE FUNCTION "public"."get_upload_progress"("recording_id" bigint) RETURNS TABLE("id" bigint, "progress_percentage" integer, "upload_status" "text", "bytes_uploaded" bigint, "total_bytes" bigint)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  return query
  select 
    vr.id,
    vr.upload_progress as progress_percentage,
    vr.upload_status,
    coalesce(us.bytes_uploaded, 0) as bytes_uploaded,
    coalesce(us.total_bytes, vr.file_size) as total_bytes
  from public.video_recordings vr
  left join public.upload_sessions us on us.video_recording_id = vr.id and us.status = 'active'
  where vr.id = recording_id and vr.user_id = (select auth.uid());
end;
$$;


ALTER FUNCTION "public"."get_upload_progress"("recording_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  insert into public.profiles (user_id, username, full_name, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data->>'username',
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."handle_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."migrate_results_to_metrics"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $_$
declare
  job_record record;
  metric_record record;
begin
  -- Iterate through analysis jobs that have results in JSONB format
  for job_record in 
    select id, results 
    from public.analysis_jobs 
    where results is not null and results != '{}'::jsonb
  loop
    -- Extract metrics from JSONB and insert into analysis_metrics table
    for metric_record in
      select 
        key as metric_key,
        case 
          when jsonb_typeof(value) = 'number' then (value::text)::numeric
          when jsonb_typeof(value) = 'string' and value::text ~ '^[0-9]+\.?[0-9]*$' then (value::text)::numeric
          else 0
        end as metric_value,
        case 
          when key like '%_percentage' or key like '%_score' then 'percentage'
          when key like '%_time' or key like '%_duration' then 'seconds'
          when key like '%_angle' then 'degrees'
          when key like '%_distance' then 'pixels'
          else 'count'
        end as unit
      from jsonb_each(job_record.results)
      where jsonb_typeof(value) in ('number', 'string')
        and (jsonb_typeof(value) = 'number' or value::text ~ '^[0-9]+\.?[0-9]*$')
    loop
      -- Insert metric if it doesn't already exist
      insert into public.analysis_metrics (analysis_id, metric_key, metric_value, unit)
      values (job_record.id, metric_record.metric_key, metric_record.metric_value, metric_record.unit)
      on conflict do nothing;
    end loop;
  end loop;
end;
$_$;


ALTER FUNCTION "public"."migrate_results_to_metrics"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reset_feedback_generation_state"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF trim(coalesce(NEW.message, '')) = '' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.ssml_status := 'queued';
    NEW.audio_status := 'queued';
    NEW.ssml_attempts := 0;
    NEW.audio_attempts := 0;
    NEW.ssml_last_error := NULL;
    NEW.audio_last_error := NULL;
    NEW.ssml_updated_at := now();
    NEW.audio_updated_at := now();
  ELSIF TG_OP = 'UPDATE' THEN
    IF trim(coalesce(OLD.message, '')) <> trim(coalesce(NEW.message, '')) THEN
      NEW.ssml_status := 'queued';
      NEW.audio_status := 'queued';
      NEW.ssml_attempts := 0;
      NEW.audio_attempts := 0;
      NEW.ssml_last_error := NULL;
      NEW.audio_last_error := NULL;
      NEW.ssml_updated_at := now();
      NEW.audio_updated_at := now();
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."reset_feedback_generation_state"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."reset_feedback_generation_state"() IS 'Resets SSML/audio processing state when feedback content changes.';



CREATE OR REPLACE FUNCTION "public"."store_analysis_audio_segment"("p_analysis_id" "uuid", "p_feedback_id" bigint, "p_audio_url" "text", "p_duration_ms" integer DEFAULT NULL::integer, "p_format" "text" DEFAULT 'aac'::"text", "p_provider" "text" DEFAULT 'gemini'::"text", "p_version" "text" DEFAULT NULL::"text") RETURNS bigint
    LANGUAGE "plpgsql" SECURITY DEFINER
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


ALTER FUNCTION "public"."store_analysis_audio_segment"("p_analysis_id" "uuid", "p_feedback_id" bigint, "p_audio_url" "text", "p_duration_ms" integer, "p_format" "text", "p_provider" "text", "p_version" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."store_analysis_results"("analysis_job_id" bigint, "p_summary_text" "text" DEFAULT NULL::"text", "p_metrics" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $_$
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
$_$;


ALTER FUNCTION "public"."store_analysis_results"("analysis_job_id" bigint, "p_summary_text" "text", "p_metrics" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."store_audio_segment"("p_analysis_feedback_id" bigint, "p_audio_url" "text", "p_duration_ms" integer DEFAULT NULL::integer, "p_format" "text" DEFAULT 'aac'::"text", "p_provider" "text" DEFAULT 'gemini'::"text", "p_version" "text" DEFAULT NULL::"text") RETURNS bigint
    LANGUAGE "plpgsql" SECURITY DEFINER
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


ALTER FUNCTION "public"."store_audio_segment"("p_analysis_feedback_id" bigint, "p_audio_url" "text", "p_duration_ms" integer, "p_format" "text", "p_provider" "text", "p_version" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."store_enhanced_analysis_results"("analysis_job_id" bigint, "p_full_feedback_text" "text" DEFAULT NULL::"text", "p_summary_text" "text" DEFAULT NULL::"text", "p_processing_time_ms" bigint DEFAULT NULL::bigint, "p_video_source_type" "text" DEFAULT NULL::"text", "p_feedback" "jsonb" DEFAULT '[]'::"jsonb", "p_metrics" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
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


ALTER FUNCTION "public"."store_enhanced_analysis_results"("analysis_job_id" bigint, "p_full_feedback_text" "text", "p_summary_text" "text", "p_processing_time_ms" bigint, "p_video_source_type" "text", "p_feedback" "jsonb", "p_metrics" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."store_enhanced_analysis_results"("analysis_job_id" bigint, "p_full_feedback_text" "text" DEFAULT NULL::"text", "p_summary_text" "text" DEFAULT NULL::"text", "p_ssml" "text" DEFAULT NULL::"text", "p_audio_url" "text" DEFAULT NULL::"text", "p_processing_time_ms" bigint DEFAULT NULL::bigint, "p_video_source_type" "text" DEFAULT NULL::"text", "p_feedback" "jsonb" DEFAULT '[]'::"jsonb", "p_metrics" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "void"
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
  -- that creates records in the analyses table
end;
$$;


ALTER FUNCTION "public"."store_enhanced_analysis_results"("analysis_job_id" bigint, "p_full_feedback_text" "text", "p_summary_text" "text", "p_ssml" "text", "p_audio_url" "text", "p_processing_time_ms" bigint, "p_video_source_type" "text", "p_feedback" "jsonb", "p_metrics" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."webhook_analysis_kickoff"("video_recording_id" bigint) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    recording_record record;
    job_id bigint;
BEGIN
    -- Get video recording details
    SELECT vr.* INTO recording_record
    FROM public.video_recordings vr
    WHERE vr.id = video_recording_id
    AND vr.upload_status = 'completed';
    
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Video recording not found or not completed'
        );
    END IF;
    
    -- Enqueue analysis job
    INSERT INTO public.analysis_jobs (
        user_id,
        video_recording_id,
        status,
        created_at
    ) VALUES (
        recording_record.user_id,
        recording_record.id,
        'queued',
        now()
    )
    ON CONFLICT (video_recording_id) DO UPDATE SET
        status = 'queued',
        updated_at = now()
    WHERE analysis_jobs.status IN ('failed', 'cancelled')
    RETURNING id INTO job_id;
    
    RETURN jsonb_build_object(
        'success', true,
        'analysis_job_id', job_id,
        'video_recording_id', video_recording_id,
        'storage_path', recording_record.storage_path
    );
END;
$$;


ALTER FUNCTION "public"."webhook_analysis_kickoff"("video_recording_id" bigint) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."webhook_analysis_kickoff"("video_recording_id" bigint) IS 'Webhook-callable function to kickoff analysis for completed video uploads';


SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."analyses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "job_id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "full_feedback_text" "text",
    "summary_text" "text",
    "raw_generated_text" "text",
    "full_feedback_json" "jsonb",
    "feedback_prompt" "text"
);


ALTER TABLE "public"."analyses" OWNER TO "postgres";


COMMENT ON TABLE "public"."analyses" IS 'Normalized analysis results with feedback content and prompts';



COMMENT ON COLUMN "public"."analyses"."job_id" IS 'Reference to the analysis job this result belongs to';



COMMENT ON COLUMN "public"."analyses"."full_feedback_text" IS 'Complete AI-generated feedback text';



COMMENT ON COLUMN "public"."analyses"."summary_text" IS 'Summarized feedback text';



COMMENT ON COLUMN "public"."analyses"."raw_generated_text" IS 'Raw text output from the AI model before processing';



COMMENT ON COLUMN "public"."analyses"."full_feedback_json" IS 'Complete JSON structure from AI analysis';



COMMENT ON COLUMN "public"."analyses"."feedback_prompt" IS 'Prompt used to generate the feedback';



CREATE TABLE IF NOT EXISTS "public"."analysis_audio_segments" (
    "id" bigint NOT NULL,
    "analysis_feedback_id" bigint NOT NULL,
    "audio_url" "text" NOT NULL,
    "audio_duration_ms" integer,
    "audio_format" "text" DEFAULT 'mp3'::"text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "analysis_id" "uuid",
    "audio_prompt" "text",
    "format" "text" DEFAULT 'aac'::"text",
    "duration_ms" integer,
    "provider" "text" DEFAULT 'gemini'::"text",
    "version" "text",
    "segment_index" integer DEFAULT 0,
    CONSTRAINT "analysis_audio_segments_audio_format_check" CHECK (("audio_format" = ANY (ARRAY['mp3'::"text", 'aac'::"text", 'wav'::"text"]))),
    CONSTRAINT "analysis_audio_segments_format_check" CHECK (("format" = ANY (ARRAY['aac'::"text", 'mp3'::"text", 'wav'::"text"])))
);


ALTER TABLE "public"."analysis_audio_segments" OWNER TO "postgres";


COMMENT ON TABLE "public"."analysis_audio_segments" IS 'Audio segments per feedback item. SSML content now stored separately in analysis_ssml_segments.';



COMMENT ON COLUMN "public"."analysis_audio_segments"."analysis_feedback_id" IS 'Reference to the feedback item this audio segment belongs to';



COMMENT ON COLUMN "public"."analysis_audio_segments"."audio_url" IS 'URL to the generated audio file';



COMMENT ON COLUMN "public"."analysis_audio_segments"."audio_duration_ms" IS 'Duration of the audio segment in milliseconds';



COMMENT ON COLUMN "public"."analysis_audio_segments"."audio_format" IS 'Audio format (mp3, aac, wav)';



COMMENT ON COLUMN "public"."analysis_audio_segments"."analysis_id" IS 'Reference to the analysis this audio segment belongs to (nullable during migration)';



COMMENT ON COLUMN "public"."analysis_audio_segments"."audio_prompt" IS 'Prompt used to generate the audio (TTS)';



ALTER TABLE "public"."analysis_audio_segments" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."analysis_audio_segments_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."analysis_feedback" (
    "id" bigint NOT NULL,
    "analysis_id" "uuid" NOT NULL,
    "timestamp_seconds" numeric NOT NULL,
    "category" "text" NOT NULL,
    "message" "text" NOT NULL,
    "confidence" numeric,
    "impact" numeric,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "ssml_status" "text" DEFAULT 'queued'::"text",
    "audio_status" "text" DEFAULT 'queued'::"text",
    "ssml_attempts" integer DEFAULT 0 NOT NULL,
    "audio_attempts" integer DEFAULT 0 NOT NULL,
    "ssml_last_error" "text",
    "audio_last_error" "text",
    "ssml_updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "audio_updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "analysis_feedback_audio_status_check" CHECK (("audio_status" = ANY (ARRAY['queued'::"text", 'processing'::"text", 'completed'::"text", 'failed'::"text"]))),
    CONSTRAINT "analysis_feedback_confidence_check" CHECK ((("confidence" >= (0)::numeric) AND ("confidence" <= (1)::numeric))),
    CONSTRAINT "analysis_feedback_impact_check" CHECK ((("impact" >= (0)::numeric) AND ("impact" <= (1)::numeric))),
    CONSTRAINT "analysis_feedback_ssml_status_check" CHECK (("ssml_status" = ANY (ARRAY['queued'::"text", 'processing'::"text", 'completed'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."analysis_feedback" OWNER TO "postgres";


COMMENT ON TABLE "public"."analysis_feedback" IS 'Individual feedback items with processing status tracking for SSML and audio generation.';



COMMENT ON COLUMN "public"."analysis_feedback"."timestamp_seconds" IS 'Timestamp in video where feedback applies';



COMMENT ON COLUMN "public"."analysis_feedback"."category" IS 'Feedback category (Posture, Movement, etc.)';



COMMENT ON COLUMN "public"."analysis_feedback"."confidence" IS 'AI confidence score (0-1)';



COMMENT ON COLUMN "public"."analysis_feedback"."impact" IS 'Impact score of the feedback (0-1)';



ALTER TABLE "public"."analysis_feedback" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."analysis_feedback_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."analysis_jobs" (
    "id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "video_recording_id" bigint NOT NULL,
    "status" "text" DEFAULT 'queued'::"text" NOT NULL,
    "progress_percentage" integer DEFAULT 0,
    "processing_started_at" timestamp with time zone,
    "processing_completed_at" timestamp with time zone,
    "error_message" "text",
    "results" "jsonb" DEFAULT '{}'::"jsonb",
    "pose_data" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "processing_time_ms" bigint,
    "video_source_type" "text",
    CONSTRAINT "analysis_jobs_progress_percentage_check" CHECK ((("progress_percentage" >= 0) AND ("progress_percentage" <= 100))),
    CONSTRAINT "analysis_jobs_status_check" CHECK (("status" = ANY (ARRAY['queued'::"text", 'processing'::"text", 'completed'::"text", 'failed'::"text"]))),
    CONSTRAINT "analysis_jobs_video_source_type_check" CHECK (("video_source_type" = ANY (ARRAY['live_recording'::"text", 'uploaded_video'::"text"])))
);


ALTER TABLE "public"."analysis_jobs" OWNER TO "postgres";


COMMENT ON TABLE "public"."analysis_jobs" IS 'Analysis job tracking table. Audio is now stored per-feedback in analysis_audio_segments.';



COMMENT ON COLUMN "public"."analysis_jobs"."processing_time_ms" IS 'Total processing time in milliseconds';



COMMENT ON COLUMN "public"."analysis_jobs"."video_source_type" IS 'Source type of the video being analyzed';



ALTER TABLE "public"."analysis_jobs" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."analysis_jobs_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."analysis_metrics" (
    "id" bigint NOT NULL,
    "analysis_id" bigint NOT NULL,
    "metric_key" "text" NOT NULL,
    "metric_value" numeric NOT NULL,
    "unit" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."analysis_metrics" OWNER TO "postgres";


COMMENT ON TABLE "public"."analysis_metrics" IS 'Individual metrics extracted from video analysis';



COMMENT ON COLUMN "public"."analysis_metrics"."analysis_id" IS 'Reference to parent analysis job';



COMMENT ON COLUMN "public"."analysis_metrics"."metric_key" IS 'Metric identifier (e.g., form_score, balance_rating)';



COMMENT ON COLUMN "public"."analysis_metrics"."metric_value" IS 'Numeric value of the metric';



COMMENT ON COLUMN "public"."analysis_metrics"."unit" IS 'Unit of measurement (e.g., percentage, seconds, degrees)';



ALTER TABLE "public"."analysis_metrics" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."analysis_metrics_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."analysis_ssml_segments" (
    "id" bigint NOT NULL,
    "feedback_id" bigint NOT NULL,
    "segment_index" integer DEFAULT 0 NOT NULL,
    "ssml" "text" NOT NULL,
    "provider" "text" DEFAULT 'gemini'::"text" NOT NULL,
    "version" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."analysis_ssml_segments" OWNER TO "postgres";


COMMENT ON TABLE "public"."analysis_ssml_segments" IS 'SSML content per feedback item. Separated from audio for independent processing.';



CREATE SEQUENCE IF NOT EXISTS "public"."analysis_ssml_segments_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."analysis_ssml_segments_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."analysis_ssml_segments_id_seq" OWNED BY "public"."analysis_ssml_segments"."id";



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "username" "text",
    "full_name" "text",
    "avatar_url" "text",
    "bio" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON TABLE "public"."profiles" IS 'User profile information';



ALTER TABLE "public"."profiles" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."profiles_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."upload_sessions" (
    "id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "video_recording_id" bigint,
    "session_id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "signed_url" "text" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "bytes_uploaded" bigint DEFAULT 0,
    "total_bytes" bigint NOT NULL,
    "chunk_size" integer DEFAULT 1048576,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "upload_sessions_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'completed'::"text", 'expired'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."upload_sessions" OWNER TO "postgres";


COMMENT ON TABLE "public"."upload_sessions" IS 'Upload session tracking for resumable uploads';



ALTER TABLE "public"."upload_sessions" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."upload_sessions_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."video_recordings" (
    "id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "filename" "text" NOT NULL,
    "original_filename" "text",
    "file_size" bigint NOT NULL,
    "duration_seconds" integer NOT NULL,
    "format" "text" NOT NULL,
    "storage_path" "text" NOT NULL,
    "upload_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "upload_progress" integer DEFAULT 0,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "video_recordings_duration_seconds_check" CHECK ((("duration_seconds" > 0) AND ("duration_seconds" <= 60))),
    CONSTRAINT "video_recordings_format_check" CHECK (("format" = ANY (ARRAY['mp4'::"text", 'mov'::"text"]))),
    CONSTRAINT "video_recordings_upload_progress_check" CHECK ((("upload_progress" >= 0) AND ("upload_progress" <= 100))),
    CONSTRAINT "video_recordings_upload_status_check" CHECK (("upload_status" = ANY (ARRAY['pending'::"text", 'uploading'::"text", 'completed'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."video_recordings" OWNER TO "postgres";


COMMENT ON TABLE "public"."video_recordings" IS 'User uploaded video recordings for analysis';



ALTER TABLE "public"."video_recordings" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."video_recordings_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



ALTER TABLE ONLY "public"."analysis_ssml_segments" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."analysis_ssml_segments_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."analyses"
    ADD CONSTRAINT "analyses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."analysis_audio_segments"
    ADD CONSTRAINT "analysis_audio_segments_feedback_id_segment_index_key" UNIQUE ("analysis_feedback_id", "segment_index");



ALTER TABLE ONLY "public"."analysis_audio_segments"
    ADD CONSTRAINT "analysis_audio_segments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."analysis_feedback"
    ADD CONSTRAINT "analysis_feedback_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."analysis_jobs"
    ADD CONSTRAINT "analysis_jobs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."analysis_metrics"
    ADD CONSTRAINT "analysis_metrics_analysis_metric_unique" UNIQUE ("analysis_id", "metric_key");



ALTER TABLE ONLY "public"."analysis_metrics"
    ADD CONSTRAINT "analysis_metrics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."analysis_ssml_segments"
    ADD CONSTRAINT "analysis_ssml_segments_feedback_id_segment_index_key" UNIQUE ("feedback_id", "segment_index");



ALTER TABLE ONLY "public"."analysis_ssml_segments"
    ADD CONSTRAINT "analysis_ssml_segments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_username_key" UNIQUE ("username");



ALTER TABLE ONLY "public"."upload_sessions"
    ADD CONSTRAINT "upload_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."upload_sessions"
    ADD CONSTRAINT "upload_sessions_session_id_key" UNIQUE ("session_id");



ALTER TABLE ONLY "public"."video_recordings"
    ADD CONSTRAINT "video_recordings_pkey" PRIMARY KEY ("id");



CREATE INDEX "analyses_created_at_idx" ON "public"."analyses" USING "btree" ("created_at" DESC);



CREATE INDEX "analyses_feedback_json_idx" ON "public"."analyses" USING "gin" ("full_feedback_json");



CREATE INDEX "analyses_job_id_idx" ON "public"."analyses" USING "btree" ("job_id");



CREATE INDEX "analysis_audio_segments_analysis_id_idx" ON "public"."analysis_audio_segments" USING "btree" ("analysis_id");



CREATE INDEX "analysis_audio_segments_created_at_idx" ON "public"."analysis_audio_segments" USING "btree" ("created_at" DESC);



CREATE INDEX "analysis_audio_segments_feedback_format_idx" ON "public"."analysis_audio_segments" USING "btree" ("analysis_feedback_id", "audio_format");



CREATE INDEX "analysis_audio_segments_feedback_id_idx" ON "public"."analysis_audio_segments" USING "btree" ("analysis_feedback_id");



CREATE INDEX "analysis_audio_segments_format_idx" ON "public"."analysis_audio_segments" USING "btree" ("audio_format");



CREATE INDEX "analysis_feedback_analysis_category_idx" ON "public"."analysis_feedback" USING "btree" ("analysis_id", "category");



CREATE INDEX "analysis_feedback_analysis_id_idx" ON "public"."analysis_feedback" USING "btree" ("analysis_id");



CREATE INDEX "analysis_feedback_analysis_timestamp_idx" ON "public"."analysis_feedback" USING "btree" ("analysis_id", "timestamp_seconds");



CREATE INDEX "analysis_feedback_audio_status_idx" ON "public"."analysis_feedback" USING "btree" ("audio_status");



CREATE INDEX "analysis_feedback_category_idx" ON "public"."analysis_feedback" USING "btree" ("category");



CREATE INDEX "analysis_feedback_created_at_idx" ON "public"."analysis_feedback" USING "btree" ("created_at" DESC);



CREATE INDEX "analysis_feedback_ssml_status_idx" ON "public"."analysis_feedback" USING "btree" ("ssml_status");



CREATE INDEX "analysis_feedback_timestamp_idx" ON "public"."analysis_feedback" USING "btree" ("timestamp_seconds");



CREATE INDEX "analysis_jobs_created_at_idx" ON "public"."analysis_jobs" USING "btree" ("created_at" DESC);



CREATE INDEX "analysis_jobs_status_idx" ON "public"."analysis_jobs" USING "btree" ("status");



CREATE INDEX "analysis_jobs_user_id_idx" ON "public"."analysis_jobs" USING "btree" ("user_id");



CREATE INDEX "analysis_jobs_video_recording_id_idx" ON "public"."analysis_jobs" USING "btree" ("video_recording_id");



CREATE INDEX "analysis_metrics_analysis_id_idx" ON "public"."analysis_metrics" USING "btree" ("analysis_id");



CREATE INDEX "analysis_metrics_analysis_metric_idx" ON "public"."analysis_metrics" USING "btree" ("analysis_id", "metric_key");



CREATE INDEX "analysis_metrics_created_at_idx" ON "public"."analysis_metrics" USING "btree" ("created_at" DESC);



CREATE INDEX "analysis_metrics_metric_key_idx" ON "public"."analysis_metrics" USING "btree" ("metric_key");



CREATE INDEX "analysis_ssml_segments_created_at_idx" ON "public"."analysis_ssml_segments" USING "btree" ("created_at");



CREATE INDEX "profiles_user_id_idx" ON "public"."profiles" USING "btree" ("user_id");



CREATE INDEX "profiles_username_idx" ON "public"."profiles" USING "btree" ("username");



CREATE INDEX "upload_sessions_expires_at_idx" ON "public"."upload_sessions" USING "btree" ("expires_at");



CREATE INDEX "upload_sessions_session_id_idx" ON "public"."upload_sessions" USING "btree" ("session_id");



CREATE INDEX "upload_sessions_status_idx" ON "public"."upload_sessions" USING "btree" ("status");



CREATE INDEX "upload_sessions_user_id_idx" ON "public"."upload_sessions" USING "btree" ("user_id");



CREATE INDEX "video_recordings_created_at_idx" ON "public"."video_recordings" USING "btree" ("created_at" DESC);



CREATE INDEX "video_recordings_upload_status_idx" ON "public"."video_recordings" USING "btree" ("upload_status");



CREATE INDEX "video_recordings_user_id_idx" ON "public"."video_recordings" USING "btree" ("user_id");



CREATE OR REPLACE TRIGGER "create_analysis_job_on_upload_complete" AFTER UPDATE ON "public"."video_recordings" FOR EACH ROW EXECUTE FUNCTION "public"."create_analysis_job_on_upload_complete"();



CREATE OR REPLACE TRIGGER "enqueue_analysis_job_on_upload_complete" AFTER UPDATE ON "public"."video_recordings" FOR EACH ROW WHEN (("old"."upload_status" IS DISTINCT FROM "new"."upload_status")) EXECUTE FUNCTION "public"."enqueue_analysis_job_on_upload_complete"();



CREATE OR REPLACE TRIGGER "handle_analyses_updated_at" BEFORE UPDATE ON "public"."analyses" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_analysis_jobs_updated_at" BEFORE UPDATE ON "public"."analysis_jobs" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_analysis_metrics_updated_at" BEFORE UPDATE ON "public"."analysis_metrics" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_upload_sessions_updated_at" BEFORE UPDATE ON "public"."upload_sessions" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "handle_video_recordings_updated_at" BEFORE UPDATE ON "public"."video_recordings" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "reset_feedback_generation_state_insert" BEFORE INSERT ON "public"."analysis_feedback" FOR EACH ROW EXECUTE FUNCTION "public"."reset_feedback_generation_state"();



CREATE OR REPLACE TRIGGER "reset_feedback_generation_state_update" BEFORE UPDATE ON "public"."analysis_feedback" FOR EACH ROW WHEN (("old"."message" IS DISTINCT FROM "new"."message")) EXECUTE FUNCTION "public"."reset_feedback_generation_state"();



ALTER TABLE ONLY "public"."analyses"
    ADD CONSTRAINT "analyses_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."analysis_jobs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."analysis_audio_segments"
    ADD CONSTRAINT "analysis_audio_segments_analysis_feedback_id_fkey" FOREIGN KEY ("analysis_feedback_id") REFERENCES "public"."analysis_feedback"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."analysis_audio_segments"
    ADD CONSTRAINT "analysis_audio_segments_analysis_id_fkey" FOREIGN KEY ("analysis_id") REFERENCES "public"."analyses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."analysis_feedback"
    ADD CONSTRAINT "analysis_feedback_analysis_id_fkey" FOREIGN KEY ("analysis_id") REFERENCES "public"."analyses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."analysis_jobs"
    ADD CONSTRAINT "analysis_jobs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."analysis_jobs"
    ADD CONSTRAINT "analysis_jobs_video_recording_id_fkey" FOREIGN KEY ("video_recording_id") REFERENCES "public"."video_recordings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."analysis_metrics"
    ADD CONSTRAINT "analysis_metrics_analysis_id_fkey" FOREIGN KEY ("analysis_id") REFERENCES "public"."analysis_jobs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."analysis_ssml_segments"
    ADD CONSTRAINT "analysis_ssml_segments_feedback_id_fkey" FOREIGN KEY ("feedback_id") REFERENCES "public"."analysis_feedback"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."upload_sessions"
    ADD CONSTRAINT "upload_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."upload_sessions"
    ADD CONSTRAINT "upload_sessions_video_recording_id_fkey" FOREIGN KEY ("video_recording_id") REFERENCES "public"."video_recordings"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."video_recordings"
    ADD CONSTRAINT "video_recordings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Public profiles are viewable by everyone" ON "public"."profiles" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Service role can manage all analyses" ON "public"."analyses" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can manage all analysis feedback" ON "public"."analysis_feedback" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can manage all analysis jobs" ON "public"."analysis_jobs" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can manage all analysis metrics" ON "public"."analysis_metrics" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can manage all audio segments" ON "public"."analysis_audio_segments" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can manage all upload sessions" ON "public"."upload_sessions" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can manage all video recordings" ON "public"."video_recordings" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Users can delete their own profile" ON "public"."profiles" FOR DELETE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can delete their own upload sessions" ON "public"."upload_sessions" FOR DELETE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can delete their own video recordings" ON "public"."video_recordings" FOR DELETE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can insert analyses for their own jobs" ON "public"."analyses" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."analysis_jobs" "aj"
  WHERE (("aj"."id" = "analyses"."job_id") AND ("aj"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can insert audio segments for their own analyses" ON "public"."analysis_audio_segments" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."analyses" "a"
     JOIN "public"."analysis_jobs" "aj" ON (("aj"."id" = "a"."job_id")))
  WHERE (("a"."id" = "analysis_audio_segments"."analysis_id") AND ("aj"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can insert feedback for their own analyses" ON "public"."analysis_feedback" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."analyses" "a"
     JOIN "public"."analysis_jobs" "aj" ON (("aj"."id" = "a"."job_id")))
  WHERE (("a"."id" = "analysis_feedback"."analysis_id") AND ("aj"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can insert metrics for their own analyses" ON "public"."analysis_metrics" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."analysis_jobs" "aj"
  WHERE (("aj"."id" = "analysis_metrics"."analysis_id") AND ("aj"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can insert their own analysis jobs" ON "public"."analysis_jobs" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can insert their own profile" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can insert their own upload sessions" ON "public"."upload_sessions" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can insert their own video recordings" ON "public"."video_recordings" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can update analyses for their own jobs" ON "public"."analyses" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."analysis_jobs" "aj"
  WHERE (("aj"."id" = "analyses"."job_id") AND ("aj"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."analysis_jobs" "aj"
  WHERE (("aj"."id" = "analyses"."job_id") AND ("aj"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can update audio segments for their own analyses" ON "public"."analysis_audio_segments" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."analyses" "a"
     JOIN "public"."analysis_jobs" "aj" ON (("aj"."id" = "a"."job_id")))
  WHERE (("a"."id" = "analysis_audio_segments"."analysis_id") AND ("aj"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."analyses" "a"
     JOIN "public"."analysis_jobs" "aj" ON (("aj"."id" = "a"."job_id")))
  WHERE (("a"."id" = "analysis_audio_segments"."analysis_id") AND ("aj"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can update metrics for their own analyses" ON "public"."analysis_metrics" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."analysis_jobs" "aj"
  WHERE (("aj"."id" = "analysis_metrics"."analysis_id") AND ("aj"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."analysis_jobs" "aj"
  WHERE (("aj"."id" = "analysis_metrics"."analysis_id") AND ("aj"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can update their own analysis jobs" ON "public"."analysis_jobs" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can update their own profile" ON "public"."profiles" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can update their own upload sessions" ON "public"."upload_sessions" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can update their own video recordings" ON "public"."video_recordings" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can view analyses for their own jobs" ON "public"."analyses" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."analysis_jobs" "aj"
  WHERE (("aj"."id" = "analyses"."job_id") AND ("aj"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can view audio segments for their own analyses" ON "public"."analysis_audio_segments" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."analyses" "a"
     JOIN "public"."analysis_jobs" "aj" ON (("aj"."id" = "a"."job_id")))
  WHERE (("a"."id" = "analysis_audio_segments"."analysis_id") AND ("aj"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can view feedback for their own analyses" ON "public"."analysis_feedback" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."analyses" "a"
     JOIN "public"."analysis_jobs" "aj" ON (("aj"."id" = "a"."job_id")))
  WHERE (("a"."id" = "analysis_feedback"."analysis_id") AND ("aj"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can view metrics for their own analyses" ON "public"."analysis_metrics" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."analysis_jobs" "aj"
  WHERE (("aj"."id" = "analysis_metrics"."analysis_id") AND ("aj"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can view their own analysis jobs" ON "public"."analysis_jobs" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can view their own upload sessions" ON "public"."upload_sessions" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can view their own video recordings" ON "public"."video_recordings" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



ALTER TABLE "public"."analyses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."analysis_audio_segments" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."analysis_feedback" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."analysis_jobs" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."analysis_metrics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."analysis_ssml_segments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "analysis_ssml_segments_user_access" ON "public"."analysis_ssml_segments" USING ((EXISTS ( SELECT 1
   FROM ("public"."analysis_feedback" "af"
     JOIN "public"."analysis_jobs" "aj" ON (("aj"."id" = (("af"."analysis_id")::"text")::bigint)))
  WHERE (("af"."id" = "analysis_ssml_segments"."feedback_id") AND ("aj"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."upload_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."video_recordings" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."backfill_analyses_from_jobs"() TO "anon";
GRANT ALL ON FUNCTION "public"."backfill_analyses_from_jobs"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."backfill_analyses_from_jobs"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_expired_upload_sessions"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_expired_upload_sessions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_expired_upload_sessions"() TO "service_role";



GRANT ALL ON FUNCTION "public"."create_analysis_job_on_upload_complete"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_analysis_job_on_upload_complete"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_analysis_job_on_upload_complete"() TO "service_role";



GRANT ALL ON FUNCTION "public"."enforce_processed_mime_whitelist"() TO "anon";
GRANT ALL ON FUNCTION "public"."enforce_processed_mime_whitelist"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_processed_mime_whitelist"() TO "service_role";



GRANT ALL ON FUNCTION "public"."enforce_video_mime_whitelist"() TO "anon";
GRANT ALL ON FUNCTION "public"."enforce_video_mime_whitelist"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enforce_video_mime_whitelist"() TO "service_role";



GRANT ALL ON FUNCTION "public"."enqueue_analysis_job_on_upload_complete"() TO "anon";
GRANT ALL ON FUNCTION "public"."enqueue_analysis_job_on_upload_complete"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."enqueue_analysis_job_on_upload_complete"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_analysis_with_metrics"("analysis_job_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."get_analysis_with_metrics"("analysis_job_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_analysis_with_metrics"("analysis_job_id" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_audio_segments_for_feedback"("feedback_item_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."get_audio_segments_for_feedback"("feedback_item_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_audio_segments_for_feedback"("feedback_item_id" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_complete_analysis"("p_job_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."get_complete_analysis"("p_job_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_complete_analysis"("p_job_id" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_enhanced_analysis_with_feedback"("analysis_job_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."get_enhanced_analysis_with_feedback"("analysis_job_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_enhanced_analysis_with_feedback"("analysis_job_id" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_feedback_with_audio"("analysis_job_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."get_feedback_with_audio"("analysis_job_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_feedback_with_audio"("analysis_job_id" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_upload_progress"("recording_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."get_upload_progress"("recording_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_upload_progress"("recording_id" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."migrate_results_to_metrics"() TO "anon";
GRANT ALL ON FUNCTION "public"."migrate_results_to_metrics"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."migrate_results_to_metrics"() TO "service_role";



GRANT ALL ON FUNCTION "public"."reset_feedback_generation_state"() TO "anon";
GRANT ALL ON FUNCTION "public"."reset_feedback_generation_state"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."reset_feedback_generation_state"() TO "service_role";



GRANT ALL ON FUNCTION "public"."store_analysis_audio_segment"("p_analysis_id" "uuid", "p_feedback_id" bigint, "p_audio_url" "text", "p_duration_ms" integer, "p_format" "text", "p_provider" "text", "p_version" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."store_analysis_audio_segment"("p_analysis_id" "uuid", "p_feedback_id" bigint, "p_audio_url" "text", "p_duration_ms" integer, "p_format" "text", "p_provider" "text", "p_version" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."store_analysis_audio_segment"("p_analysis_id" "uuid", "p_feedback_id" bigint, "p_audio_url" "text", "p_duration_ms" integer, "p_format" "text", "p_provider" "text", "p_version" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."store_analysis_results"("analysis_job_id" bigint, "p_summary_text" "text", "p_metrics" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."store_analysis_results"("analysis_job_id" bigint, "p_summary_text" "text", "p_metrics" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."store_analysis_results"("analysis_job_id" bigint, "p_summary_text" "text", "p_metrics" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."store_audio_segment"("p_analysis_feedback_id" bigint, "p_audio_url" "text", "p_duration_ms" integer, "p_format" "text", "p_provider" "text", "p_version" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."store_audio_segment"("p_analysis_feedback_id" bigint, "p_audio_url" "text", "p_duration_ms" integer, "p_format" "text", "p_provider" "text", "p_version" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."store_audio_segment"("p_analysis_feedback_id" bigint, "p_audio_url" "text", "p_duration_ms" integer, "p_format" "text", "p_provider" "text", "p_version" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."store_enhanced_analysis_results"("analysis_job_id" bigint, "p_full_feedback_text" "text", "p_summary_text" "text", "p_processing_time_ms" bigint, "p_video_source_type" "text", "p_feedback" "jsonb", "p_metrics" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."store_enhanced_analysis_results"("analysis_job_id" bigint, "p_full_feedback_text" "text", "p_summary_text" "text", "p_processing_time_ms" bigint, "p_video_source_type" "text", "p_feedback" "jsonb", "p_metrics" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."store_enhanced_analysis_results"("analysis_job_id" bigint, "p_full_feedback_text" "text", "p_summary_text" "text", "p_processing_time_ms" bigint, "p_video_source_type" "text", "p_feedback" "jsonb", "p_metrics" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."store_enhanced_analysis_results"("analysis_job_id" bigint, "p_full_feedback_text" "text", "p_summary_text" "text", "p_ssml" "text", "p_audio_url" "text", "p_processing_time_ms" bigint, "p_video_source_type" "text", "p_feedback" "jsonb", "p_metrics" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."store_enhanced_analysis_results"("analysis_job_id" bigint, "p_full_feedback_text" "text", "p_summary_text" "text", "p_ssml" "text", "p_audio_url" "text", "p_processing_time_ms" bigint, "p_video_source_type" "text", "p_feedback" "jsonb", "p_metrics" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."store_enhanced_analysis_results"("analysis_job_id" bigint, "p_full_feedback_text" "text", "p_summary_text" "text", "p_ssml" "text", "p_audio_url" "text", "p_processing_time_ms" bigint, "p_video_source_type" "text", "p_feedback" "jsonb", "p_metrics" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."webhook_analysis_kickoff"("video_recording_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."webhook_analysis_kickoff"("video_recording_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."webhook_analysis_kickoff"("video_recording_id" bigint) TO "service_role";



GRANT ALL ON TABLE "public"."analyses" TO "anon";
GRANT ALL ON TABLE "public"."analyses" TO "authenticated";
GRANT ALL ON TABLE "public"."analyses" TO "service_role";



GRANT ALL ON TABLE "public"."analysis_audio_segments" TO "anon";
GRANT ALL ON TABLE "public"."analysis_audio_segments" TO "authenticated";
GRANT ALL ON TABLE "public"."analysis_audio_segments" TO "service_role";



GRANT ALL ON SEQUENCE "public"."analysis_audio_segments_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."analysis_audio_segments_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."analysis_audio_segments_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."analysis_feedback" TO "anon";
GRANT ALL ON TABLE "public"."analysis_feedback" TO "authenticated";
GRANT ALL ON TABLE "public"."analysis_feedback" TO "service_role";



GRANT ALL ON SEQUENCE "public"."analysis_feedback_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."analysis_feedback_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."analysis_feedback_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."analysis_jobs" TO "anon";
GRANT ALL ON TABLE "public"."analysis_jobs" TO "authenticated";
GRANT ALL ON TABLE "public"."analysis_jobs" TO "service_role";



GRANT ALL ON SEQUENCE "public"."analysis_jobs_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."analysis_jobs_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."analysis_jobs_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."analysis_metrics" TO "anon";
GRANT ALL ON TABLE "public"."analysis_metrics" TO "authenticated";
GRANT ALL ON TABLE "public"."analysis_metrics" TO "service_role";



GRANT ALL ON SEQUENCE "public"."analysis_metrics_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."analysis_metrics_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."analysis_metrics_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."analysis_ssml_segments" TO "anon";
GRANT ALL ON TABLE "public"."analysis_ssml_segments" TO "authenticated";
GRANT ALL ON TABLE "public"."analysis_ssml_segments" TO "service_role";



GRANT ALL ON SEQUENCE "public"."analysis_ssml_segments_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."analysis_ssml_segments_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."analysis_ssml_segments_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON SEQUENCE "public"."profiles_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."profiles_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."profiles_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."upload_sessions" TO "anon";
GRANT ALL ON TABLE "public"."upload_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."upload_sessions" TO "service_role";



GRANT ALL ON SEQUENCE "public"."upload_sessions_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."upload_sessions_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."upload_sessions_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."video_recordings" TO "anon";
GRANT ALL ON TABLE "public"."video_recordings" TO "authenticated";
GRANT ALL ON TABLE "public"."video_recordings" TO "service_role";



GRANT ALL ON SEQUENCE "public"."video_recordings_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."video_recordings_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."video_recordings_id_seq" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






RESET ALL;
