

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
    SET "search_path" TO ''
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
    SET "search_path" TO ''
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
    SET "search_path" TO ''
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
    SET "search_path" TO ''
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
    SET "search_path" TO ''
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
    SET "search_path" TO ''
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



CREATE OR REPLACE FUNCTION "public"."finalize_video_on_raw_object"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  affected_rows int;
begin
  -- Only for raw bucket (compare id directly)
  if new.bucket_id <> 'raw' then
    return new;
  end if;

  raise notice 'TRIGGER: Processing raw bucket object: %', new.name;

  -- Mark matching video_recordings as completed, idempotent
  update public.video_recordings
    set upload_status = 'completed',
        upload_progress = 100,
        updated_at = now()
  where storage_path = new.name
    and upload_status <> 'completed';

  get diagnostics affected_rows = row_count;
  raise notice 'TRIGGER: Updated % video_recordings rows for path: %', affected_rows, new.name;

  return new;
end;
$$;


ALTER FUNCTION "public"."finalize_video_on_raw_object"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."finalize_video_on_raw_object"() IS 'Finalizes video_recordings on raw storage object creation';



CREATE OR REPLACE FUNCTION "public"."get_analysis_with_metrics"("analysis_job_id" bigint) RETURNS TABLE("analysis_id" bigint, "status" "text", "progress_percentage" integer, "summary_text" "text", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "metrics" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
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


CREATE OR REPLACE FUNCTION "public"."get_audio_segments_for_feedback"("feedback_item_id" bigint) RETURNS TABLE("id" bigint, "audio_url" "text", "storage_path" "text", "duration_ms" numeric, "format" "text", "provider" "text", "version" "text", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
BEGIN
  RETURN QUERY
  SELECT
    aas.id,
    aas.audio_url,
    aas.storage_path,
    aas.duration_ms,
    aas.format,
    aas.provider,
    aas.version,
    aas.created_at
  FROM public.analysis_audio_segments aas
  WHERE aas.feedback_id = feedback_item_id
  ORDER BY aas.segment_index ASC;
END;
$$;


ALTER FUNCTION "public"."get_audio_segments_for_feedback"("feedback_item_id" bigint) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_audio_segments_for_feedback"("feedback_item_id" bigint) IS 'Get all audio segments for a specific feedback item. Returns storage_path for semantic path-based signed URL generation (Task 32), with audio_url fallback for legacy records.';



CREATE OR REPLACE FUNCTION "public"."get_complete_analysis"("p_job_id" bigint) RETURNS TABLE("analysis_id" "uuid", "job_status" "text", "job_progress_percentage" integer, "full_feedback_text" "text", "summary_text" "text", "raw_generated_text" "text", "full_feedback_json" "jsonb", "feedback_prompt" "text", "title" "text", "audio_segments" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
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
    a.title,
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
           a.raw_generated_text, a.full_feedback_json, a.feedback_prompt, a.title;
end;
$$;


ALTER FUNCTION "public"."get_complete_analysis"("p_job_id" bigint) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_complete_analysis"("p_job_id" bigint) IS 'Get complete analysis data including feedback content, title, and audio segments';



CREATE OR REPLACE FUNCTION "public"."get_enhanced_analysis_with_feedback"("analysis_job_id" bigint) RETURNS TABLE("analysis_id" bigint, "status" "text", "progress_percentage" integer, "processing_time_ms" bigint, "video_source_type" "text", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "feedback" "jsonb", "metrics" "jsonb", "analyses" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
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
            'title', a.title,
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
            'title', a.title,
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


COMMENT ON FUNCTION "public"."get_enhanced_analysis_with_feedback"("analysis_job_id" bigint) IS 'Get enhanced analysis data with feedback, metrics, and analyses including title';



CREATE OR REPLACE FUNCTION "public"."get_feedback_with_audio"("analysis_job_id" bigint) RETURNS TABLE("feedback_id" bigint, "analysis_id" bigint, "timestamp_seconds" numeric, "category" "text", "message" "text", "confidence" numeric, "impact" numeric, "feedback_created_at" timestamp with time zone, "audio_segments" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
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
    SET "search_path" TO ''
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
    SET "search_path" TO ''
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
    SET "search_path" TO ''
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."handle_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."migrate_results_to_metrics"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
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
    SET "search_path" TO ''
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



CREATE OR REPLACE FUNCTION "public"."store_analysis_audio_segment"("p_analysis_id" "uuid", "p_feedback_id" bigint, "p_audio_url" "text", "p_duration_ms" numeric DEFAULT NULL::numeric, "p_format" "text" DEFAULT 'aac'::"text", "p_provider" "text" DEFAULT 'gemini'::"text", "p_version" "text" DEFAULT NULL::"text") RETURNS bigint
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
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


ALTER FUNCTION "public"."store_analysis_audio_segment"("p_analysis_id" "uuid", "p_feedback_id" bigint, "p_audio_url" "text", "p_duration_ms" numeric, "p_format" "text", "p_provider" "text", "p_version" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."store_analysis_results"("p_job_id" bigint, "p_full_feedback_text" "text" DEFAULT NULL::"text", "p_summary_text" "text" DEFAULT NULL::"text", "p_raw_generated_text" "text" DEFAULT NULL::"text", "p_full_feedback_json" "jsonb" DEFAULT NULL::"jsonb", "p_feedback_prompt" "text" DEFAULT NULL::"text", "p_title" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_analysis_id uuid;
begin
  insert into public.analyses (
    job_id,
    full_feedback_text,
    summary_text,
    raw_generated_text,
    full_feedback_json,
    feedback_prompt,
    title
  ) values (
    p_job_id,
    p_full_feedback_text,
    p_summary_text,
    p_raw_generated_text,
    p_full_feedback_json,
    p_feedback_prompt,
    p_title
  )
  on conflict (job_id) do update set
    full_feedback_text = excluded.full_feedback_text,
    summary_text = excluded.summary_text,
    raw_generated_text = excluded.raw_generated_text,
    full_feedback_json = excluded.full_feedback_json,
    feedback_prompt = excluded.feedback_prompt,
    title = excluded.title,
    updated_at = now()
  returning id into v_analysis_id;

  update public.analysis_jobs
  set updated_at = now()
  where id = p_job_id;

  return v_analysis_id;
end;
$$;


ALTER FUNCTION "public"."store_analysis_results"("p_job_id" bigint, "p_full_feedback_text" "text", "p_summary_text" "text", "p_raw_generated_text" "text", "p_full_feedback_json" "jsonb", "p_feedback_prompt" "text", "p_title" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."store_audio_segment"("p_analysis_feedback_id" bigint, "p_audio_url" "text", "p_duration_ms" numeric DEFAULT NULL::numeric, "p_format" "text" DEFAULT 'aac'::"text", "p_provider" "text" DEFAULT 'gemini'::"text", "p_version" "text" DEFAULT NULL::"text") RETURNS bigint
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
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


ALTER FUNCTION "public"."store_audio_segment"("p_analysis_feedback_id" bigint, "p_audio_url" "text", "p_duration_ms" numeric, "p_format" "text", "p_provider" "text", "p_version" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."webhook_analysis_kickoff"("video_recording_id" bigint) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
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



CREATE OR REPLACE FUNCTION "storage"."can_insert_object"("bucketid" "text", "name" "text", "owner" "uuid", "metadata" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  INSERT INTO "storage"."objects" ("bucket_id", "name", "owner", "metadata") VALUES (bucketid, name, owner, metadata);
  -- hack to rollback the successful insert
  RAISE sqlstate 'PT200' using
  message = 'ROLLBACK',
  detail = 'rollback successful insert';
END
$$;


ALTER FUNCTION "storage"."can_insert_object"("bucketid" "text", "name" "text", "owner" "uuid", "metadata" "jsonb") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."extension"("name" "text") RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
_parts text[];
_filename text;
BEGIN
	select string_to_array(name, '/') into _parts;
	select _parts[array_length(_parts,1)] into _filename;
	-- @todo return the last part instead of 2
	return reverse(split_part(reverse(_filename), '.', 1));
END
$$;


ALTER FUNCTION "storage"."extension"("name" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."filename"("name" "text") RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
_parts text[];
BEGIN
	select string_to_array(name, '/') into _parts;
	return _parts[array_length(_parts,1)];
END
$$;


ALTER FUNCTION "storage"."filename"("name" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."foldername"("name" "text") RETURNS "text"[]
    LANGUAGE "plpgsql"
    AS $$
DECLARE
_parts text[];
BEGIN
	select string_to_array(name, '/') into _parts;
	return _parts[1:array_length(_parts,1)-1];
END
$$;


ALTER FUNCTION "storage"."foldername"("name" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."get_size_by_bucket"() RETURNS TABLE("size" bigint, "bucket_id" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    return query
        select sum((metadata->>'size')::int) as size, obj.bucket_id
        from "storage".objects as obj
        group by obj.bucket_id;
END
$$;


ALTER FUNCTION "storage"."get_size_by_bucket"() OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."list_multipart_uploads_with_delimiter"("bucket_id" "text", "prefix_param" "text", "delimiter_param" "text", "max_keys" integer DEFAULT 100, "next_key_token" "text" DEFAULT ''::"text", "next_upload_token" "text" DEFAULT ''::"text") RETURNS TABLE("key" "text", "id" "text", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql"
    AS $_$
BEGIN
    RETURN QUERY EXECUTE
        'SELECT DISTINCT ON(key COLLATE "C") * from (
            SELECT
                CASE
                    WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                        substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1)))
                    ELSE
                        key
                END AS key, id, created_at
            FROM
                storage.s3_multipart_uploads
            WHERE
                bucket_id = $5 AND
                key ILIKE $1 || ''%'' AND
                CASE
                    WHEN $4 != '''' AND $6 = '''' THEN
                        CASE
                            WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                                substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1))) COLLATE "C" > $4
                            ELSE
                                key COLLATE "C" > $4
                            END
                    ELSE
                        true
                END AND
                CASE
                    WHEN $6 != '''' THEN
                        id COLLATE "C" > $6
                    ELSE
                        true
                    END
            ORDER BY
                key COLLATE "C" ASC, created_at ASC) as e order by key COLLATE "C" LIMIT $3'
        USING prefix_param, delimiter_param, max_keys, next_key_token, bucket_id, next_upload_token;
END;
$_$;


ALTER FUNCTION "storage"."list_multipart_uploads_with_delimiter"("bucket_id" "text", "prefix_param" "text", "delimiter_param" "text", "max_keys" integer, "next_key_token" "text", "next_upload_token" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."list_objects_with_delimiter"("bucket_id" "text", "prefix_param" "text", "delimiter_param" "text", "max_keys" integer DEFAULT 100, "start_after" "text" DEFAULT ''::"text", "next_token" "text" DEFAULT ''::"text") RETURNS TABLE("name" "text", "id" "uuid", "metadata" "jsonb", "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql"
    AS $_$
BEGIN
    RETURN QUERY EXECUTE
        'SELECT DISTINCT ON(name COLLATE "C") * from (
            SELECT
                CASE
                    WHEN position($2 IN substring(name from length($1) + 1)) > 0 THEN
                        substring(name from 1 for length($1) + position($2 IN substring(name from length($1) + 1)))
                    ELSE
                        name
                END AS name, id, metadata, updated_at
            FROM
                storage.objects
            WHERE
                bucket_id = $5 AND
                name ILIKE $1 || ''%'' AND
                CASE
                    WHEN $6 != '''' THEN
                    name COLLATE "C" > $6
                ELSE true END
                AND CASE
                    WHEN $4 != '''' THEN
                        CASE
                            WHEN position($2 IN substring(name from length($1) + 1)) > 0 THEN
                                substring(name from 1 for length($1) + position($2 IN substring(name from length($1) + 1))) COLLATE "C" > $4
                            ELSE
                                name COLLATE "C" > $4
                            END
                    ELSE
                        true
                END
            ORDER BY
                name COLLATE "C" ASC) as e order by name COLLATE "C" LIMIT $3'
        USING prefix_param, delimiter_param, max_keys, next_token, bucket_id, start_after;
END;
$_$;


ALTER FUNCTION "storage"."list_objects_with_delimiter"("bucket_id" "text", "prefix_param" "text", "delimiter_param" "text", "max_keys" integer, "start_after" "text", "next_token" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."operation"() RETURNS "text"
    LANGUAGE "plpgsql" STABLE
    AS $$
BEGIN
    RETURN current_setting('storage.operation', true);
END;
$$;


ALTER FUNCTION "storage"."operation"() OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."search"("prefix" "text", "bucketname" "text", "limits" integer DEFAULT 100, "levels" integer DEFAULT 1, "offsets" integer DEFAULT 0, "search" "text" DEFAULT ''::"text", "sortcolumn" "text" DEFAULT 'name'::"text", "sortorder" "text" DEFAULT 'asc'::"text") RETURNS TABLE("name" "text", "id" "uuid", "updated_at" timestamp with time zone, "created_at" timestamp with time zone, "last_accessed_at" timestamp with time zone, "metadata" "jsonb")
    LANGUAGE "plpgsql" STABLE
    AS $_$
declare
  v_order_by text;
  v_sort_order text;
begin
  case
    when sortcolumn = 'name' then
      v_order_by = 'name';
    when sortcolumn = 'updated_at' then
      v_order_by = 'updated_at';
    when sortcolumn = 'created_at' then
      v_order_by = 'created_at';
    when sortcolumn = 'last_accessed_at' then
      v_order_by = 'last_accessed_at';
    else
      v_order_by = 'name';
  end case;

  case
    when sortorder = 'asc' then
      v_sort_order = 'asc';
    when sortorder = 'desc' then
      v_sort_order = 'desc';
    else
      v_sort_order = 'asc';
  end case;

  v_order_by = v_order_by || ' ' || v_sort_order;

  return query execute
    'with folders as (
       select path_tokens[$1] as folder
       from storage.objects
         where objects.name ilike $2 || $3 || ''%''
           and bucket_id = $4
           and array_length(objects.path_tokens, 1) <> $1
       group by folder
       order by folder ' || v_sort_order || '
     )
     (select folder as "name",
            null as id,
            null as updated_at,
            null as created_at,
            null as last_accessed_at,
            null as metadata from folders)
     union all
     (select path_tokens[$1] as "name",
            id,
            updated_at,
            created_at,
            last_accessed_at,
            metadata
     from storage.objects
     where objects.name ilike $2 || $3 || ''%''
       and bucket_id = $4
       and array_length(objects.path_tokens, 1) = $1
     order by ' || v_order_by || ')
     limit $5
     offset $6' using levels, prefix, search, bucketname, limits, offsets;
end;
$_$;


ALTER FUNCTION "storage"."search"("prefix" "text", "bucketname" "text", "limits" integer, "levels" integer, "offsets" integer, "search" "text", "sortcolumn" "text", "sortorder" "text") OWNER TO "supabase_storage_admin";


CREATE OR REPLACE FUNCTION "storage"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW; 
END;
$$;


ALTER FUNCTION "storage"."update_updated_at_column"() OWNER TO "supabase_storage_admin";

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
    "feedback_prompt" "text",
    "title" "text"
);


ALTER TABLE "public"."analyses" OWNER TO "postgres";


COMMENT ON TABLE "public"."analyses" IS 'Normalized analysis results with feedback content and prompts';



COMMENT ON COLUMN "public"."analyses"."job_id" IS 'Reference to the analysis job this result belongs to';



COMMENT ON COLUMN "public"."analyses"."full_feedback_text" IS 'Complete AI-generated feedback text';



COMMENT ON COLUMN "public"."analyses"."summary_text" IS 'Summarized feedback text';



COMMENT ON COLUMN "public"."analyses"."raw_generated_text" IS 'Raw text output from the AI model before processing';



COMMENT ON COLUMN "public"."analyses"."full_feedback_json" IS 'Complete JSON structure from AI analysis';



COMMENT ON COLUMN "public"."analyses"."feedback_prompt" IS 'Prompt used to generate the feedback';



COMMENT ON COLUMN "public"."analyses"."title" IS 'Concise roast title for the analysis (max 60 characters) extracted from AI prompt';



CREATE TABLE IF NOT EXISTS "public"."analysis_audio_segments" (
    "id" bigint NOT NULL,
    "feedback_id" bigint NOT NULL,
    "audio_url" "text" NOT NULL,
    "duration_ms" numeric,
    "format" "text" DEFAULT 'aac'::"text",
    "provider" "text" DEFAULT 'gemini'::"text",
    "version" "text",
    "segment_index" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "prompt" "text",
    "storage_path" "text",
    CONSTRAINT "analysis_audio_segments_format_check" CHECK (("format" = ANY (ARRAY['aac'::"text", 'mp3'::"text", 'wav'::"text"])))
);


ALTER TABLE "public"."analysis_audio_segments" OWNER TO "postgres";


COMMENT ON TABLE "public"."analysis_audio_segments" IS 'Audio segments per feedback item. SSML content now stored separately in analysis_ssml_segments.';



COMMENT ON COLUMN "public"."analysis_audio_segments"."feedback_id" IS 'Foreign key to analysis_feedback.id';



COMMENT ON COLUMN "public"."analysis_audio_segments"."audio_url" IS 'URL to the generated audio file';



COMMENT ON COLUMN "public"."analysis_audio_segments"."duration_ms" IS 'Duration in milliseconds (numeric to support decimals)';



COMMENT ON COLUMN "public"."analysis_audio_segments"."format" IS 'Audio format (aac, mp3, wav)';



COMMENT ON COLUMN "public"."analysis_audio_segments"."prompt" IS 'Prompt used to generate the audio for this segment';



COMMENT ON COLUMN "public"."analysis_audio_segments"."storage_path" IS 'Storage path format: {user_id}/videos/{yyyymmdd}/{video_recording_id}/audio/{feedback_id}/{segment_index}.{format}
Date extracted from video_recordings.created_at (UTC). Groups audio with video assets. Example: 488a7161.../videos/20251014/1234/audio/1069/0.wav';



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
    "ssml_prompt" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."analysis_ssml_segments" OWNER TO "postgres";


COMMENT ON TABLE "public"."analysis_ssml_segments" IS 'SSML content per feedback item. Separated from audio for independent processing.';



COMMENT ON COLUMN "public"."analysis_ssml_segments"."ssml_prompt" IS 'Prompt used to generate the SSML for this segment';



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



CREATE TABLE IF NOT EXISTS "public"."user_feedback" (
    "id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "message" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_feedback_message_length_check" CHECK (("char_length"("message") <= 1000)),
    CONSTRAINT "user_feedback_type_check" CHECK (("type" = ANY (ARRAY['bug'::"text", 'suggestion'::"text", 'complaint'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."user_feedback" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_feedback" IS 'User-submitted feedback for product improvement';



ALTER TABLE "public"."user_feedback" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."user_feedback_id_seq"
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
    "duration_seconds" numeric NOT NULL,
    "format" "text" NOT NULL,
    "storage_path" "text" NOT NULL,
    "upload_status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "upload_progress" integer DEFAULT 0,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "thumbnail_url" "text",
    CONSTRAINT "video_recordings_duration_seconds_check" CHECK ((("duration_seconds" > (0)::numeric) AND ("duration_seconds" <= (60)::numeric))),
    CONSTRAINT "video_recordings_format_check" CHECK (("format" = ANY (ARRAY['mp4'::"text", 'mov'::"text"]))),
    CONSTRAINT "video_recordings_upload_progress_check" CHECK ((("upload_progress" >= 0) AND ("upload_progress" <= 100))),
    CONSTRAINT "video_recordings_upload_status_check" CHECK (("upload_status" = ANY (ARRAY['pending'::"text", 'uploading'::"text", 'completed'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."video_recordings" OWNER TO "postgres";


COMMENT ON TABLE "public"."video_recordings" IS 'User uploaded video recordings for analysis';



COMMENT ON COLUMN "public"."video_recordings"."duration_seconds" IS 'Duration in seconds (numeric to support decimal values for precise timing)';



COMMENT ON COLUMN "public"."video_recordings"."storage_path" IS 'Storage path format: {user_id}/videos/{yyyymmdd}/{video_recording_id}/video.{format}
Date extracted from created_at (UTC). Video-centric grouping for all related assets. Example: 488a7161.../videos/20251014/1234/video.mp4';



COMMENT ON COLUMN "public"."video_recordings"."thumbnail_url" IS 'Public URL to video thumbnail in Supabase Storage (thumbnails bucket)';



ALTER TABLE "public"."video_recordings" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."video_recordings_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "storage"."buckets" (
    "id" "text" NOT NULL,
    "name" "text" NOT NULL,
    "owner" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "public" boolean DEFAULT false,
    "avif_autodetection" boolean DEFAULT false,
    "file_size_limit" bigint,
    "allowed_mime_types" "text"[],
    "owner_id" "text"
);


ALTER TABLE "storage"."buckets" OWNER TO "supabase_storage_admin";


COMMENT ON COLUMN "storage"."buckets"."owner" IS 'Field is deprecated, use owner_id instead';



CREATE TABLE IF NOT EXISTS "storage"."migrations" (
    "id" integer NOT NULL,
    "name" character varying(100) NOT NULL,
    "hash" character varying(40) NOT NULL,
    "executed_at" timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "storage"."migrations" OWNER TO "supabase_storage_admin";


CREATE TABLE IF NOT EXISTS "storage"."objects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "bucket_id" "text",
    "name" "text",
    "owner" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "last_accessed_at" timestamp with time zone DEFAULT "now"(),
    "metadata" "jsonb",
    "path_tokens" "text"[] GENERATED ALWAYS AS ("string_to_array"("name", '/'::"text")) STORED,
    "version" "text",
    "owner_id" "text",
    "user_metadata" "jsonb"
);


ALTER TABLE "storage"."objects" OWNER TO "supabase_storage_admin";


COMMENT ON COLUMN "storage"."objects"."owner" IS 'Field is deprecated, use owner_id instead';



CREATE TABLE IF NOT EXISTS "storage"."s3_multipart_uploads" (
    "id" "text" NOT NULL,
    "in_progress_size" bigint DEFAULT 0 NOT NULL,
    "upload_signature" "text" NOT NULL,
    "bucket_id" "text" NOT NULL,
    "key" "text" NOT NULL COLLATE "pg_catalog"."C",
    "version" "text" NOT NULL,
    "owner_id" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_metadata" "jsonb"
);


ALTER TABLE "storage"."s3_multipart_uploads" OWNER TO "supabase_storage_admin";


CREATE TABLE IF NOT EXISTS "storage"."s3_multipart_uploads_parts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "upload_id" "text" NOT NULL,
    "size" bigint DEFAULT 0 NOT NULL,
    "part_number" integer NOT NULL,
    "bucket_id" "text" NOT NULL,
    "key" "text" NOT NULL COLLATE "pg_catalog"."C",
    "etag" "text" NOT NULL,
    "owner_id" "text",
    "version" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "storage"."s3_multipart_uploads_parts" OWNER TO "supabase_storage_admin";


ALTER TABLE ONLY "public"."analysis_ssml_segments" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."analysis_ssml_segments_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."analyses"
    ADD CONSTRAINT "analyses_job_id_key" UNIQUE ("job_id");



ALTER TABLE ONLY "public"."analyses"
    ADD CONSTRAINT "analyses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."analysis_audio_segments"
    ADD CONSTRAINT "analysis_audio_segments_feedback_id_segment_index_key" UNIQUE ("feedback_id", "segment_index");



ALTER TABLE ONLY "public"."analysis_audio_segments"
    ADD CONSTRAINT "analysis_audio_segments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."analysis_feedback"
    ADD CONSTRAINT "analysis_feedback_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."analysis_jobs"
    ADD CONSTRAINT "analysis_jobs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."analysis_jobs"
    ADD CONSTRAINT "analysis_jobs_video_recording_id_key" UNIQUE ("video_recording_id");



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



ALTER TABLE ONLY "public"."user_feedback"
    ADD CONSTRAINT "user_feedback_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."video_recordings"
    ADD CONSTRAINT "video_recordings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "storage"."buckets"
    ADD CONSTRAINT "buckets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "storage"."migrations"
    ADD CONSTRAINT "migrations_name_key" UNIQUE ("name");



ALTER TABLE ONLY "storage"."migrations"
    ADD CONSTRAINT "migrations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "storage"."objects"
    ADD CONSTRAINT "objects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "storage"."s3_multipart_uploads_parts"
    ADD CONSTRAINT "s3_multipart_uploads_parts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "storage"."s3_multipart_uploads"
    ADD CONSTRAINT "s3_multipart_uploads_pkey" PRIMARY KEY ("id");



CREATE INDEX "analyses_created_at_idx" ON "public"."analyses" USING "btree" ("created_at" DESC);



CREATE INDEX "analyses_feedback_json_idx" ON "public"."analyses" USING "gin" ("full_feedback_json");



CREATE INDEX "analyses_job_id_idx" ON "public"."analyses" USING "btree" ("job_id");



CREATE INDEX "analysis_audio_segments_created_at_idx" ON "public"."analysis_audio_segments" USING "btree" ("created_at" DESC);



CREATE INDEX "analysis_audio_segments_feedback_format_idx" ON "public"."analysis_audio_segments" USING "btree" ("feedback_id", "format");



CREATE INDEX "analysis_audio_segments_feedback_id_idx" ON "public"."analysis_audio_segments" USING "btree" ("feedback_id");



CREATE INDEX "analysis_audio_segments_format_idx" ON "public"."analysis_audio_segments" USING "btree" ("format");



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



CREATE INDEX "idx_analysis_feedback_active" ON "public"."analysis_feedback" USING "btree" ("analysis_id", "created_at" DESC) WHERE (("audio_status" <> 'completed'::"text") OR ("ssml_status" <> 'completed'::"text"));



COMMENT ON INDEX "public"."idx_analysis_feedback_active" IS 'Optimizes realtime subscription filtering and backfill queries for active analysis sessions';



CREATE INDEX "idx_audio_segments_storage_path" ON "public"."analysis_audio_segments" USING "btree" ("storage_path") WHERE ("storage_path" IS NOT NULL);



CREATE INDEX "idx_video_recordings_thumbnail_url" ON "public"."video_recordings" USING "btree" ("thumbnail_url") WHERE ("thumbnail_url" IS NOT NULL);



CREATE INDEX "profiles_user_id_idx" ON "public"."profiles" USING "btree" ("user_id");



CREATE INDEX "profiles_username_idx" ON "public"."profiles" USING "btree" ("username");



CREATE INDEX "upload_sessions_expires_at_idx" ON "public"."upload_sessions" USING "btree" ("expires_at");



CREATE INDEX "upload_sessions_session_id_idx" ON "public"."upload_sessions" USING "btree" ("session_id");



CREATE INDEX "upload_sessions_status_idx" ON "public"."upload_sessions" USING "btree" ("status");



CREATE INDEX "upload_sessions_user_id_idx" ON "public"."upload_sessions" USING "btree" ("user_id");



CREATE INDEX "user_feedback_created_at_idx" ON "public"."user_feedback" USING "btree" ("created_at" DESC);



CREATE INDEX "user_feedback_user_id_idx" ON "public"."user_feedback" USING "btree" ("user_id");



CREATE INDEX "video_recordings_created_at_idx" ON "public"."video_recordings" USING "btree" ("created_at" DESC);



CREATE INDEX "video_recordings_storage_path_idx" ON "public"."video_recordings" USING "btree" ("storage_path");



CREATE INDEX "video_recordings_upload_status_idx" ON "public"."video_recordings" USING "btree" ("upload_status");



CREATE INDEX "video_recordings_user_id_idx" ON "public"."video_recordings" USING "btree" ("user_id");



CREATE UNIQUE INDEX "bname" ON "storage"."buckets" USING "btree" ("name");



CREATE UNIQUE INDEX "bucketid_objname" ON "storage"."objects" USING "btree" ("bucket_id", "name");



CREATE INDEX "idx_multipart_uploads_list" ON "storage"."s3_multipart_uploads" USING "btree" ("bucket_id", "key", "created_at");



CREATE INDEX "idx_objects_bucket_id_name" ON "storage"."objects" USING "btree" ("bucket_id", "name" COLLATE "C");



CREATE INDEX "name_prefix_search" ON "storage"."objects" USING "btree" ("name" "text_pattern_ops");



CREATE OR REPLACE TRIGGER "auto-start-analysis-on-upload-completed" AFTER INSERT ON "public"."analysis_jobs" FOR EACH ROW EXECUTE FUNCTION "supabase_functions"."http_request"('http://host.docker.internal:54321/functions/v1/ai-analyze-video/webhook', 'POST', '{"Content-type":"application/json","X-Db-Webhook-Secret":"your-test-secret-123"}', '{}', '5000');



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



CREATE OR REPLACE TRIGGER "trg_finalize_video_on_raw_object" AFTER INSERT ON "storage"."objects" FOR EACH ROW EXECUTE FUNCTION "public"."finalize_video_on_raw_object"();



CREATE OR REPLACE TRIGGER "update_objects_updated_at" BEFORE UPDATE ON "storage"."objects" FOR EACH ROW EXECUTE FUNCTION "storage"."update_updated_at_column"();



ALTER TABLE ONLY "public"."analyses"
    ADD CONSTRAINT "analyses_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."analysis_jobs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."analysis_audio_segments"
    ADD CONSTRAINT "analysis_audio_segments_feedback_id_fkey" FOREIGN KEY ("feedback_id") REFERENCES "public"."analysis_feedback"("id") ON DELETE CASCADE;



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



ALTER TABLE ONLY "public"."user_feedback"
    ADD CONSTRAINT "user_feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."video_recordings"
    ADD CONSTRAINT "video_recordings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "storage"."objects"
    ADD CONSTRAINT "objects_bucketId_fkey" FOREIGN KEY ("bucket_id") REFERENCES "storage"."buckets"("id");



ALTER TABLE ONLY "storage"."s3_multipart_uploads"
    ADD CONSTRAINT "s3_multipart_uploads_bucket_id_fkey" FOREIGN KEY ("bucket_id") REFERENCES "storage"."buckets"("id");



ALTER TABLE ONLY "storage"."s3_multipart_uploads_parts"
    ADD CONSTRAINT "s3_multipart_uploads_parts_bucket_id_fkey" FOREIGN KEY ("bucket_id") REFERENCES "storage"."buckets"("id");



ALTER TABLE ONLY "storage"."s3_multipart_uploads_parts"
    ADD CONSTRAINT "s3_multipart_uploads_parts_upload_id_fkey" FOREIGN KEY ("upload_id") REFERENCES "storage"."s3_multipart_uploads"("id") ON DELETE CASCADE;



CREATE POLICY "Public profiles are viewable by everyone" ON "public"."profiles" FOR SELECT TO "authenticated", "anon" USING (true);



CREATE POLICY "Service role can manage all analyses" ON "public"."analyses" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can manage all analysis feedback" ON "public"."analysis_feedback" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can manage all analysis jobs" ON "public"."analysis_jobs" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can manage all analysis metrics" ON "public"."analysis_metrics" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can manage all audio segments" ON "public"."analysis_audio_segments" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can manage all upload sessions" ON "public"."upload_sessions" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Service role can manage all video recordings" ON "public"."video_recordings" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Users can delete their own feedback" ON "public"."user_feedback" FOR DELETE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can delete their own profile" ON "public"."profiles" FOR DELETE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can delete their own upload sessions" ON "public"."upload_sessions" FOR DELETE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can delete their own video recordings" ON "public"."video_recordings" FOR DELETE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can insert analyses for their own jobs" ON "public"."analyses" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."analysis_jobs" "aj"
  WHERE (("aj"."id" = "analyses"."job_id") AND ("aj"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can insert audio segments for their own analyses" ON "public"."analysis_audio_segments" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM (("public"."analysis_feedback" "af"
     JOIN "public"."analyses" "a" ON (("a"."id" = "af"."analysis_id")))
     JOIN "public"."analysis_jobs" "aj" ON (("aj"."id" = "a"."job_id")))
  WHERE (("af"."id" = "analysis_audio_segments"."feedback_id") AND ("aj"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can insert feedback for their own analyses" ON "public"."analysis_feedback" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."analyses" "a"
     JOIN "public"."analysis_jobs" "aj" ON (("aj"."id" = "a"."job_id")))
  WHERE (("a"."id" = "analysis_feedback"."analysis_id") AND ("aj"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can insert metrics for their own analyses" ON "public"."analysis_metrics" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."analysis_jobs" "aj"
  WHERE (("aj"."id" = "analysis_metrics"."analysis_id") AND ("aj"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can insert their own analysis jobs" ON "public"."analysis_jobs" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can insert their own feedback" ON "public"."user_feedback" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can insert their own profile" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can insert their own upload sessions" ON "public"."upload_sessions" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can insert their own video recordings" ON "public"."video_recordings" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can update analyses for their own jobs" ON "public"."analyses" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."analysis_jobs" "aj"
  WHERE (("aj"."id" = "analyses"."job_id") AND ("aj"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."analysis_jobs" "aj"
  WHERE (("aj"."id" = "analyses"."job_id") AND ("aj"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can update audio segments for their own analyses" ON "public"."analysis_audio_segments" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM (("public"."analysis_feedback" "af"
     JOIN "public"."analyses" "a" ON (("a"."id" = "af"."analysis_id")))
     JOIN "public"."analysis_jobs" "aj" ON (("aj"."id" = "a"."job_id")))
  WHERE (("af"."id" = "analysis_audio_segments"."feedback_id") AND ("aj"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM (("public"."analysis_feedback" "af"
     JOIN "public"."analyses" "a" ON (("a"."id" = "af"."analysis_id")))
     JOIN "public"."analysis_jobs" "aj" ON (("aj"."id" = "a"."job_id")))
  WHERE (("af"."id" = "analysis_audio_segments"."feedback_id") AND ("aj"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can update metrics for their own analyses" ON "public"."analysis_metrics" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."analysis_jobs" "aj"
  WHERE (("aj"."id" = "analysis_metrics"."analysis_id") AND ("aj"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."analysis_jobs" "aj"
  WHERE (("aj"."id" = "analysis_metrics"."analysis_id") AND ("aj"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can update their own analysis jobs" ON "public"."analysis_jobs" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can update their own feedback" ON "public"."user_feedback" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can update their own profile" ON "public"."profiles" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can update their own upload sessions" ON "public"."upload_sessions" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can update their own video recordings" ON "public"."video_recordings" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can view analyses for their own jobs" ON "public"."analyses" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."analysis_jobs" "aj"
  WHERE (("aj"."id" = "analyses"."job_id") AND ("aj"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can view audio segments for their own analyses" ON "public"."analysis_audio_segments" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM (("public"."analysis_feedback" "af"
     JOIN "public"."analyses" "a" ON (("a"."id" = "af"."analysis_id")))
     JOIN "public"."analysis_jobs" "aj" ON (("aj"."id" = "a"."job_id")))
  WHERE (("af"."id" = "analysis_audio_segments"."feedback_id") AND ("aj"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can view feedback for their own analyses" ON "public"."analysis_feedback" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."analyses" "a"
     JOIN "public"."analysis_jobs" "aj" ON (("aj"."id" = "a"."job_id")))
  WHERE (("a"."id" = "analysis_feedback"."analysis_id") AND ("aj"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can view metrics for their own analyses" ON "public"."analysis_metrics" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."analysis_jobs" "aj"
  WHERE (("aj"."id" = "analysis_metrics"."analysis_id") AND ("aj"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



CREATE POLICY "Users can view their own analysis jobs" ON "public"."analysis_jobs" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can view their own feedback" ON "public"."user_feedback" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



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
  WHERE (("af"."id" = "analysis_ssml_segments"."feedback_id") AND ("aj"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."upload_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_feedback" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."video_recordings" ENABLE ROW LEVEL SECURITY;

-- Enable realtime for tables
-- ALTER PUBLICATION supabase_realtime ADD TABLE analysis_jobs;
-- ALTER PUBLICATION supabase_realtime ADD TABLE video_recordings;
-- ALTER PUBLICATION supabase_realtime ADD TABLE analyses;
-- ALTER PUBLICATION supabase_realtime ADD TABLE analysis_feedback;


-- Enable realtime for tables (idempotent)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE analysis_jobs;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE video_recordings;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE analyses;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE analysis_feedback;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
