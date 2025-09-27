--
-- PostgreSQL database dump
--

-- Dumped from database version 17.4
-- Dumped by pg_dump version 17.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
-- SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: pg_database_owner
--

CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";

--
-- Name: SCHEMA "public"; Type: COMMENT; Schema: -; Owner: pg_database_owner
--

COMMENT ON SCHEMA "public" IS 'standard public schema';


--
-- Name: backfill_analyses_from_jobs(); Type: FUNCTION; Schema: public; Owner: postgres
--

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
      ssml,
      audio_url
    from public.analysis_jobs
    where full_feedback_text is not null or summary_text is not null
       or ssml is not null or audio_url is not null
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

    -- Create audio segments if audio data exists
    if analysis_record.ssml is not null or analysis_record.audio_url is not null then
      insert into public.analysis_audio_segments (
        analysis_id,
        feedback_ssml,
        feedback_audio_url
      )
      select
        a.id,
        analysis_record.ssml,
        analysis_record.audio_url
      from public.analyses a
      where a.job_id = analysis_record.job_id
      order by a.created_at desc
      limit 1;
    end if;
  end loop;

  -- Update existing analysis_feedback records to reference analyses instead of jobs
  update public.analysis_feedback
  set analysis_id = a.id::text::uuid
  from public.analyses a
  where analysis_feedback.analysis_id::text::bigint = a.job_id;

  -- Update analysis_audio_segments to reference the new analyses
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

--
-- Name: FUNCTION "backfill_analyses_from_jobs"(); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION "public"."backfill_analyses_from_jobs"() IS 'Backfill analyses table from existing analysis_jobs data and update audio segments';


--
-- Name: cleanup_expired_upload_sessions(); Type: FUNCTION; Schema: public; Owner: postgres
--

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

--
-- Name: create_analysis_job_on_upload_complete(); Type: FUNCTION; Schema: public; Owner: postgres
--

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

--
-- Name: get_analysis_with_metrics(bigint); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."get_analysis_with_metrics"("analysis_job_id" bigint) RETURNS TABLE("analysis_id" bigint, "status" "text", "progress_percentage" integer, "summary_text" "text", "ssml" "text", "audio_url" "text", "created_at" timestamp with time zone, "updated_at" timestamp with time zone, "metrics" "jsonb")
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
    aj.audio_url,
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
  group by aj.id, aj.status, aj.progress_percentage, aj.summary_text, aj.ssml, aj.audio_url, aj.created_at, aj.updated_at;
end;
$$;


ALTER FUNCTION "public"."get_analysis_with_metrics"("analysis_job_id" bigint) OWNER TO "postgres";

--
-- Name: get_audio_segments_for_feedback(bigint); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."get_audio_segments_for_feedback"("feedback_item_id" bigint) RETURNS TABLE("id" bigint, "ssml" "text", "audio_url" "text", "audio_duration_ms" integer, "audio_format" "text", "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
begin
  return query
  select
    aas.id,
    aas.ssml,
    aas.audio_url,
    aas.audio_duration_ms,
    aas.audio_format,
    aas.created_at
  from public.analysis_audio_segments aas
  join public.analysis_feedback af on af.id = aas.analysis_feedback_id
  join public.analysis_jobs aj on aj.id = af.analysis_id
  where aas.analysis_feedback_id = feedback_item_id
    and aj.user_id = (select auth.uid())
  order by aas.created_at desc;
end;
$$;


ALTER FUNCTION "public"."get_audio_segments_for_feedback"("feedback_item_id" bigint) OWNER TO "postgres";

--
-- Name: FUNCTION "get_audio_segments_for_feedback"("feedback_item_id" bigint); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION "public"."get_audio_segments_for_feedback"("feedback_item_id" bigint) IS 'Get all audio segments for a specific feedback item';


--
-- Name: get_complete_analysis(bigint); Type: FUNCTION; Schema: public; Owner: postgres
--

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

--
-- Name: FUNCTION "get_complete_analysis"("p_job_id" bigint); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION "public"."get_complete_analysis"("p_job_id" bigint) IS 'Get complete analysis data including feedback content and audio segments';


--
-- Name: get_enhanced_analysis_with_feedback(bigint); Type: FUNCTION; Schema: public; Owner: postgres
--

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

--
-- Name: get_feedback_with_audio(bigint); Type: FUNCTION; Schema: public; Owner: postgres
--

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

--
-- Name: FUNCTION "get_feedback_with_audio"("analysis_job_id" bigint); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION "public"."get_feedback_with_audio"("analysis_job_id" bigint) IS 'Get feedback items with their associated audio segments for an analysis job';


--
-- Name: get_upload_progress(bigint); Type: FUNCTION; Schema: public; Owner: postgres
--

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

--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: postgres
--

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

--
-- Name: handle_updated_at(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."handle_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


ALTER FUNCTION "public"."handle_updated_at"() OWNER TO "postgres";

--
-- Name: migrate_results_to_metrics(); Type: FUNCTION; Schema: public; Owner: postgres
--

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

--
-- Name: store_analysis_audio_segment("uuid", "text", "text", integer, "text", "text", "text"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."store_analysis_audio_segment"("p_analysis_id" "uuid", "p_feedback_ssml" "text", "p_feedback_audio_url" "text", "p_audio_duration_ms" integer DEFAULT NULL::integer, "p_audio_format" "text" DEFAULT 'mp3'::"text", "p_ssml_prompt" "text" DEFAULT NULL::"text", "p_audio_prompt" "text" DEFAULT NULL::"text") RETURNS bigint
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  segment_id bigint;
begin
  -- Validate inputs
  if p_analysis_id is null or p_feedback_ssml is null or p_feedback_audio_url is null then
    raise exception 'analysis_id, feedback_ssml, and feedback_audio_url are required';
  end if;

  -- Insert the audio segment
  insert into public.analysis_audio_segments (
    analysis_id,
    feedback_ssml,
    feedback_audio_url,
    audio_duration_ms,
    audio_format,
    ssml_prompt,
    audio_prompt
  ) values (
    p_analysis_id,
    p_feedback_ssml,
    p_feedback_audio_url,
    p_audio_duration_ms,
    p_audio_format,
    p_ssml_prompt,
    p_audio_prompt
  )
  returning id into segment_id;

  return segment_id;
end;
$$;


ALTER FUNCTION "public"."store_analysis_audio_segment"("p_analysis_id" "uuid", "p_feedback_ssml" "text", "p_feedback_audio_url" "text", "p_audio_duration_ms" integer, "p_audio_format" "text", "p_ssml_prompt" "text", "p_audio_prompt" "text") OWNER TO "postgres";

--
-- Name: FUNCTION "store_analysis_audio_segment"("p_analysis_id" "uuid", "p_feedback_ssml" "text", "p_feedback_audio_url" "text", "p_audio_duration_ms" integer, "p_audio_format" "text", "p_ssml_prompt" "text", "p_audio_prompt" "text"); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION "public"."store_analysis_audio_segment"("p_analysis_id" "uuid", "p_feedback_ssml" "text", "p_feedback_audio_url" "text", "p_audio_duration_ms" integer, "p_audio_format" "text", "p_ssml_prompt" "text", "p_audio_prompt" "text") IS 'Store an audio segment for a specific analysis with prompts';


--
-- Name: store_analysis_results(bigint, "text", "text", "text", "jsonb"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."store_analysis_results"("analysis_job_id" bigint, "p_summary_text" "text" DEFAULT NULL::"text", "p_ssml" "text" DEFAULT NULL::"text", "p_audio_url" "text" DEFAULT NULL::"text", "p_metrics" "jsonb" DEFAULT '{}'::"jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $_$
declare
  metric_record record;
begin
  -- Update analysis job with text results
  update public.analysis_jobs
  set 
    summary_text = coalesce(p_summary_text, summary_text),
    ssml = coalesce(p_ssml, ssml),
    audio_url = coalesce(p_audio_url, audio_url),
    status = case when p_summary_text is not null or p_ssml is not null or p_audio_url is not null then 'completed' else status end,
    processing_completed_at = case when p_summary_text is not null or p_ssml is not null or p_audio_url is not null then now() else processing_completed_at end,
    updated_at = now()
  where id = analysis_job_id;

  -- Insert metrics if provided
  if p_metrics != '{}'::jsonb then
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
      from jsonb_each(p_metrics)
      where jsonb_typeof(value) in ('number', 'string')
        and (jsonb_typeof(value) = 'number' or value::text ~ '^[0-9]+\.?[0-9]*$')
    loop
      -- Upsert metric
      insert into public.analysis_metrics (analysis_id, metric_key, metric_value, unit)
      values (analysis_job_id, metric_record.metric_key, metric_record.metric_value, metric_record.unit)
      on conflict (analysis_id, metric_key) do update set
        metric_value = excluded.metric_value,
        unit = excluded.unit,
        updated_at = now();
    end loop;
  end if;
end;
$_$;


ALTER FUNCTION "public"."store_analysis_results"("analysis_job_id" bigint, "p_summary_text" "text", "p_ssml" "text", "p_audio_url" "text", "p_metrics" "jsonb") OWNER TO "postgres";

--
-- Name: store_analysis_results(bigint, "text", "text", "text", "jsonb", "text"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."store_analysis_results"("p_job_id" bigint, "p_full_feedback_text" "text" DEFAULT NULL::"text", "p_summary_text" "text" DEFAULT NULL::"text", "p_raw_generated_text" "text" DEFAULT NULL::"text", "p_full_feedback_json" "jsonb" DEFAULT NULL::"jsonb", "p_feedback_prompt" "text" DEFAULT NULL::"text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  analysis_id uuid;
begin
  -- Validate inputs
  if p_job_id is null then
    raise exception 'job_id is required';
  end if;

  -- Insert into analyses table
  insert into public.analyses (
    job_id,
    full_feedback_text,
    summary_text,
    raw_generated_text,
    full_feedback_json,
    feedback_prompt
  ) values (
    p_job_id,
    p_full_feedback_text,
    p_summary_text,
    p_raw_generated_text,
    p_full_feedback_json,
    p_feedback_prompt
  )
  returning id into analysis_id;

  -- Update job status if feedback was provided
  if p_full_feedback_text is not null then
    update public.analysis_jobs
    set
      status = 'completed',
      processing_completed_at = now(),
      updated_at = now()
    where id = p_job_id;
  end if;

  return analysis_id;
end;
$$;


ALTER FUNCTION "public"."store_analysis_results"("p_job_id" bigint, "p_full_feedback_text" "text", "p_summary_text" "text", "p_raw_generated_text" "text", "p_full_feedback_json" "jsonb", "p_feedback_prompt" "text") OWNER TO "postgres";

--
-- Name: FUNCTION "store_analysis_results"("p_job_id" bigint, "p_full_feedback_text" "text", "p_summary_text" "text", "p_raw_generated_text" "text", "p_full_feedback_json" "jsonb", "p_feedback_prompt" "text"); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION "public"."store_analysis_results"("p_job_id" bigint, "p_full_feedback_text" "text", "p_summary_text" "text", "p_raw_generated_text" "text", "p_full_feedback_json" "jsonb", "p_feedback_prompt" "text") IS 'Store analysis results in the new normalized analyses table';


--
-- Name: store_audio_segment(bigint, "text", "text", integer, "text"); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE OR REPLACE FUNCTION "public"."store_audio_segment"("p_analysis_feedback_id" bigint, "p_ssml" "text", "p_audio_url" "text", "p_audio_duration_ms" integer DEFAULT NULL::integer, "p_audio_format" "text" DEFAULT 'mp3'::"text") RETURNS bigint
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
declare
  segment_id bigint;
begin
  -- Validate inputs
  if p_analysis_feedback_id is null or p_ssml is null or p_audio_url is null then
    raise exception 'analysis_feedback_id, ssml, and audio_url are required';
  end if;

  -- Insert the audio segment
  insert into public.analysis_audio_segments (
    analysis_feedback_id,
    ssml,
    audio_url,
    audio_duration_ms,
    audio_format
  ) values (
    p_analysis_feedback_id,
    p_ssml,
    p_audio_url,
    p_audio_duration_ms,
    p_audio_format
  )
  returning id into segment_id;

  return segment_id;
end;
$$;


ALTER FUNCTION "public"."store_audio_segment"("p_analysis_feedback_id" bigint, "p_ssml" "text", "p_audio_url" "text", "p_audio_duration_ms" integer, "p_audio_format" "text") OWNER TO "postgres";

--
-- Name: FUNCTION "store_audio_segment"("p_analysis_feedback_id" bigint, "p_ssml" "text", "p_audio_url" "text", "p_audio_duration_ms" integer, "p_audio_format" "text"); Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON FUNCTION "public"."store_audio_segment"("p_analysis_feedback_id" bigint, "p_ssml" "text", "p_audio_url" "text", "p_audio_duration_ms" integer, "p_audio_format" "text") IS 'Store an audio segment for a specific feedback item';


--
-- Name: store_enhanced_analysis_results(bigint, "text", "text", "text", "text", bigint, "text", "jsonb", "jsonb"); Type: FUNCTION; Schema: public; Owner: postgres
--

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

SET default_tablespace = '';

SET default_table_access_method = "heap";

--
-- Name: analyses; Type: TABLE; Schema: public; Owner: postgres
--

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

--
-- Name: TABLE "analyses"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE "public"."analyses" IS 'Normalized analysis results with feedback content and prompts';


--
-- Name: COLUMN "analyses"."job_id"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN "public"."analyses"."job_id" IS 'Reference to the analysis job this result belongs to';


--
-- Name: COLUMN "analyses"."full_feedback_text"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN "public"."analyses"."full_feedback_text" IS 'Complete AI-generated feedback text';


--
-- Name: COLUMN "analyses"."summary_text"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN "public"."analyses"."summary_text" IS 'Summarized feedback text';


--
-- Name: COLUMN "analyses"."raw_generated_text"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN "public"."analyses"."raw_generated_text" IS 'Raw text output from the AI model before processing';


--
-- Name: COLUMN "analyses"."full_feedback_json"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN "public"."analyses"."full_feedback_json" IS 'Complete JSON structure from AI analysis';


--
-- Name: COLUMN "analyses"."feedback_prompt"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN "public"."analyses"."feedback_prompt" IS 'Prompt used to generate the feedback';


--
-- Name: analysis_audio_segments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."analysis_audio_segments" (
    "id" bigint NOT NULL,
    "analysis_feedback_id" bigint NOT NULL,
    "feedback_ssml" "text" NOT NULL,
    "audio_url" "text" NOT NULL,
    "audio_duration_ms" integer,
    "audio_format" "text" DEFAULT 'mp3'::"text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "analysis_id" "uuid",
    "ssml_prompt" "text",
    "audio_prompt" "text",
    CONSTRAINT "analysis_audio_segments_audio_format_check" CHECK (("audio_format" = ANY (ARRAY['mp3'::"text", 'aac'::"text", 'wav'::"text"])))
);


ALTER TABLE "public"."analysis_audio_segments" OWNER TO "postgres";

--
-- Name: TABLE "analysis_audio_segments"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE "public"."analysis_audio_segments" IS 'Audio segments for individual feedback items, enabling per-feedback voiceover';


--
-- Name: COLUMN "analysis_audio_segments"."analysis_feedback_id"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN "public"."analysis_audio_segments"."analysis_feedback_id" IS 'Reference to the feedback item this audio segment belongs to';


--


--
-- Name: COLUMN "analysis_audio_segments"."audio_url"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN "public"."analysis_audio_segments"."audio_url" IS 'URL to the generated audio file';


--
-- Name: COLUMN "analysis_audio_segments"."audio_duration_ms"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN "public"."analysis_audio_segments"."audio_duration_ms" IS 'Duration of the audio segment in milliseconds';


--
-- Name: COLUMN "analysis_audio_segments"."audio_format"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN "public"."analysis_audio_segments"."audio_format" IS 'Audio format (mp3, aac, wav)';


--
-- Name: COLUMN "analysis_audio_segments"."analysis_id"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN "public"."analysis_audio_segments"."analysis_id" IS 'Reference to the analysis this audio segment belongs to (nullable during migration)';


--
-- Name: COLUMN "analysis_audio_segments"."feedback_ssml"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN "public"."analysis_audio_segments"."feedback_ssml" IS 'SSML markup used to generate this audio segment';



--
-- Name: COLUMN "analysis_audio_segments"."ssml_prompt"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN "public"."analysis_audio_segments"."ssml_prompt" IS 'Prompt used to generate the SSML';


--
-- Name: COLUMN "analysis_audio_segments"."audio_prompt"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN "public"."analysis_audio_segments"."audio_prompt" IS 'Prompt used to generate the audio (TTS)';


--
-- Name: analysis_audio_segments_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE "public"."analysis_audio_segments" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."analysis_audio_segments_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: analysis_feedback; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE IF NOT EXISTS "public"."analysis_feedback" (
    "id" bigint NOT NULL,
    "analysis_id" "uuid" NOT NULL,
    "timestamp_seconds" numeric NOT NULL,
    "category" "text" NOT NULL,
    "message" "text" NOT NULL,
    "confidence" numeric,
    "impact" numeric,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "analysis_feedback_confidence_check" CHECK ((("confidence" >= (0)::numeric) AND ("confidence" <= (1)::numeric))),
    CONSTRAINT "analysis_feedback_impact_check" CHECK ((("impact" >= (0)::numeric) AND ("impact" <= (1)::numeric)))
);


ALTER TABLE "public"."analysis_feedback" OWNER TO "postgres";

--
-- Name: TABLE "analysis_feedback"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE "public"."analysis_feedback" IS 'Individual feedback items from AI analysis';


--
-- Name: COLUMN "analysis_feedback"."timestamp_seconds"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN "public"."analysis_feedback"."timestamp_seconds" IS 'Timestamp in video where feedback applies';


--
-- Name: COLUMN "analysis_feedback"."category"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN "public"."analysis_feedback"."category" IS 'Feedback category (Posture, Movement, etc.)';


--
-- Name: COLUMN "analysis_feedback"."confidence"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN "public"."analysis_feedback"."confidence" IS 'AI confidence score (0-1)';


--
-- Name: COLUMN "analysis_feedback"."impact"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN "public"."analysis_feedback"."impact" IS 'Impact score of the feedback (0-1)';


--
-- Name: analysis_feedback_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE "public"."analysis_feedback" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."analysis_feedback_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: analysis_jobs; Type: TABLE; Schema: public; Owner: postgres
--

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

--
-- Name: TABLE "analysis_jobs"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE "public"."analysis_jobs" IS 'AI analysis jobs for video recordings';


--
-- Name: COLUMN "analysis_jobs"."processing_time_ms"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN "public"."analysis_jobs"."processing_time_ms" IS 'Total processing time in milliseconds';


--
-- Name: COLUMN "analysis_jobs"."video_source_type"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN "public"."analysis_jobs"."video_source_type" IS 'Source type of the video being analyzed';


--
-- Name: analysis_jobs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE "public"."analysis_jobs" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."analysis_jobs_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: analysis_metrics; Type: TABLE; Schema: public; Owner: postgres
--

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

--
-- Name: TABLE "analysis_metrics"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE "public"."analysis_metrics" IS 'Individual metrics extracted from video analysis';


--
-- Name: COLUMN "analysis_metrics"."analysis_id"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN "public"."analysis_metrics"."analysis_id" IS 'Reference to parent analysis job';


--
-- Name: COLUMN "analysis_metrics"."metric_key"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN "public"."analysis_metrics"."metric_key" IS 'Metric identifier (e.g., form_score, balance_rating)';


--
-- Name: COLUMN "analysis_metrics"."metric_value"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN "public"."analysis_metrics"."metric_value" IS 'Numeric value of the metric';


--
-- Name: COLUMN "analysis_metrics"."unit"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN "public"."analysis_metrics"."unit" IS 'Unit of measurement (e.g., percentage, seconds, degrees)';


--
-- Name: analysis_metrics_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE "public"."analysis_metrics" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."analysis_metrics_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: postgres
--

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

--
-- Name: TABLE "profiles"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE "public"."profiles" IS 'User profile information';


--
-- Name: profiles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE "public"."profiles" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."profiles_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: upload_sessions; Type: TABLE; Schema: public; Owner: postgres
--

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

--
-- Name: TABLE "upload_sessions"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE "public"."upload_sessions" IS 'Upload session tracking for resumable uploads';


--
-- Name: upload_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE "public"."upload_sessions" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."upload_sessions_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: video_recordings; Type: TABLE; Schema: public; Owner: postgres
--

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

--
-- Name: TABLE "video_recordings"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON TABLE "public"."video_recordings" IS 'User uploaded video recordings for analysis';


--
-- Name: video_recordings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

ALTER TABLE "public"."video_recordings" ALTER COLUMN "id" ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME "public"."video_recordings_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: analyses analyses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."analyses"
    ADD CONSTRAINT "analyses_pkey" PRIMARY KEY ("id");


--
-- Name: analysis_audio_segments analysis_audio_segments_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."analysis_audio_segments"
    ADD CONSTRAINT "analysis_audio_segments_pkey" PRIMARY KEY ("id");


--
-- Name: analysis_feedback analysis_feedback_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."analysis_feedback"
    ADD CONSTRAINT "analysis_feedback_pkey" PRIMARY KEY ("id");


--
-- Name: analysis_jobs analysis_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."analysis_jobs"
    ADD CONSTRAINT "analysis_jobs_pkey" PRIMARY KEY ("id");


--
-- Name: analysis_metrics analysis_metrics_analysis_metric_unique; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."analysis_metrics"
    ADD CONSTRAINT "analysis_metrics_analysis_metric_unique" UNIQUE ("analysis_id", "metric_key");


--
-- Name: analysis_metrics analysis_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."analysis_metrics"
    ADD CONSTRAINT "analysis_metrics_pkey" PRIMARY KEY ("id");


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");


--
-- Name: profiles profiles_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_username_key" UNIQUE ("username");


--
-- Name: upload_sessions upload_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."upload_sessions"
    ADD CONSTRAINT "upload_sessions_pkey" PRIMARY KEY ("id");


--
-- Name: upload_sessions upload_sessions_session_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."upload_sessions"
    ADD CONSTRAINT "upload_sessions_session_id_key" UNIQUE ("session_id");


--
-- Name: video_recordings video_recordings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."video_recordings"
    ADD CONSTRAINT "video_recordings_pkey" PRIMARY KEY ("id");


--
-- Name: analyses_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "analyses_created_at_idx" ON "public"."analyses" USING "btree" ("created_at" DESC);


--
-- Name: analyses_feedback_json_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "analyses_feedback_json_idx" ON "public"."analyses" USING "gin" ("full_feedback_json");


--
-- Name: analyses_job_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "analyses_job_id_idx" ON "public"."analyses" USING "btree" ("job_id");


--
-- Name: analysis_audio_segments_analysis_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "analysis_audio_segments_analysis_id_idx" ON "public"."analysis_audio_segments" USING "btree" ("analysis_id");


--
-- Name: analysis_audio_segments_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "analysis_audio_segments_created_at_idx" ON "public"."analysis_audio_segments" USING "btree" ("created_at" DESC);


--
-- Name: analysis_audio_segments_feedback_format_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "analysis_audio_segments_feedback_format_idx" ON "public"."analysis_audio_segments" USING "btree" ("analysis_feedback_id", "audio_format");


--
-- Name: analysis_audio_segments_feedback_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "analysis_audio_segments_feedback_id_idx" ON "public"."analysis_audio_segments" USING "btree" ("analysis_feedback_id");


--
-- Name: analysis_audio_segments_format_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "analysis_audio_segments_format_idx" ON "public"."analysis_audio_segments" USING "btree" ("audio_format");


--
-- Name: analysis_feedback_analysis_category_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "analysis_feedback_analysis_category_idx" ON "public"."analysis_feedback" USING "btree" ("analysis_id", "category");


--
-- Name: analysis_feedback_analysis_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "analysis_feedback_analysis_id_idx" ON "public"."analysis_feedback" USING "btree" ("analysis_id");


--
-- Name: analysis_feedback_analysis_timestamp_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "analysis_feedback_analysis_timestamp_idx" ON "public"."analysis_feedback" USING "btree" ("analysis_id", "timestamp_seconds");


--
-- Name: analysis_feedback_category_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "analysis_feedback_category_idx" ON "public"."analysis_feedback" USING "btree" ("category");


--
-- Name: analysis_feedback_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "analysis_feedback_created_at_idx" ON "public"."analysis_feedback" USING "btree" ("created_at" DESC);


--
-- Name: analysis_feedback_timestamp_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "analysis_feedback_timestamp_idx" ON "public"."analysis_feedback" USING "btree" ("timestamp_seconds");


--
-- Name: analysis_jobs_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "analysis_jobs_created_at_idx" ON "public"."analysis_jobs" USING "btree" ("created_at" DESC);


--
-- Name: analysis_jobs_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "analysis_jobs_status_idx" ON "public"."analysis_jobs" USING "btree" ("status");


--
-- Name: analysis_jobs_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "analysis_jobs_user_id_idx" ON "public"."analysis_jobs" USING "btree" ("user_id");


--
-- Name: analysis_jobs_video_recording_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "analysis_jobs_video_recording_id_idx" ON "public"."analysis_jobs" USING "btree" ("video_recording_id");


--
-- Name: analysis_metrics_analysis_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "analysis_metrics_analysis_id_idx" ON "public"."analysis_metrics" USING "btree" ("analysis_id");


--
-- Name: analysis_metrics_analysis_metric_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "analysis_metrics_analysis_metric_idx" ON "public"."analysis_metrics" USING "btree" ("analysis_id", "metric_key");


--
-- Name: analysis_metrics_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "analysis_metrics_created_at_idx" ON "public"."analysis_metrics" USING "btree" ("created_at" DESC);


--
-- Name: analysis_metrics_metric_key_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "analysis_metrics_metric_key_idx" ON "public"."analysis_metrics" USING "btree" ("metric_key");


--
-- Name: profiles_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "profiles_user_id_idx" ON "public"."profiles" USING "btree" ("user_id");


--
-- Name: profiles_username_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "profiles_username_idx" ON "public"."profiles" USING "btree" ("username");


--
-- Name: upload_sessions_expires_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "upload_sessions_expires_at_idx" ON "public"."upload_sessions" USING "btree" ("expires_at");


--
-- Name: upload_sessions_session_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "upload_sessions_session_id_idx" ON "public"."upload_sessions" USING "btree" ("session_id");


--
-- Name: upload_sessions_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "upload_sessions_status_idx" ON "public"."upload_sessions" USING "btree" ("status");


--
-- Name: upload_sessions_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "upload_sessions_user_id_idx" ON "public"."upload_sessions" USING "btree" ("user_id");


--
-- Name: video_recordings_created_at_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "video_recordings_created_at_idx" ON "public"."video_recordings" USING "btree" ("created_at" DESC);


--
-- Name: video_recordings_upload_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "video_recordings_upload_status_idx" ON "public"."video_recordings" USING "btree" ("upload_status");


--
-- Name: video_recordings_user_id_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "video_recordings_user_id_idx" ON "public"."video_recordings" USING "btree" ("user_id");


--
-- Name: video_recordings create_analysis_job_on_upload_complete; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "create_analysis_job_on_upload_complete" AFTER UPDATE ON "public"."video_recordings" FOR EACH ROW EXECUTE FUNCTION "public"."create_analysis_job_on_upload_complete"();


--
-- Name: analyses handle_analyses_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "handle_analyses_updated_at" BEFORE UPDATE ON "public"."analyses" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();


--
-- Name: analysis_jobs handle_analysis_jobs_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "handle_analysis_jobs_updated_at" BEFORE UPDATE ON "public"."analysis_jobs" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();


--
-- Name: analysis_metrics handle_analysis_metrics_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "handle_analysis_metrics_updated_at" BEFORE UPDATE ON "public"."analysis_metrics" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();


--
-- Name: profiles handle_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "handle_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();


--
-- Name: upload_sessions handle_upload_sessions_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "handle_upload_sessions_updated_at" BEFORE UPDATE ON "public"."upload_sessions" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();


--
-- Name: video_recordings handle_video_recordings_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE OR REPLACE TRIGGER "handle_video_recordings_updated_at" BEFORE UPDATE ON "public"."video_recordings" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();


--
-- Name: analyses analyses_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."analyses"
    ADD CONSTRAINT "analyses_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "public"."analysis_jobs"("id") ON DELETE CASCADE;


--
-- Name: analysis_audio_segments analysis_audio_segments_analysis_feedback_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."analysis_audio_segments"
    ADD CONSTRAINT "analysis_audio_segments_analysis_feedback_id_fkey" FOREIGN KEY ("analysis_feedback_id") REFERENCES "public"."analysis_feedback"("id") ON DELETE CASCADE;


--
-- Name: analysis_audio_segments analysis_audio_segments_analysis_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."analysis_audio_segments"
    ADD CONSTRAINT "analysis_audio_segments_analysis_id_fkey" FOREIGN KEY ("analysis_id") REFERENCES "public"."analyses"("id") ON DELETE CASCADE;


--
-- Name: analysis_feedback analysis_feedback_analysis_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."analysis_feedback"
    ADD CONSTRAINT "analysis_feedback_analysis_id_fkey" FOREIGN KEY ("analysis_id") REFERENCES "public"."analyses"("id") ON DELETE CASCADE;


--
-- Name: analysis_jobs analysis_jobs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."analysis_jobs"
    ADD CONSTRAINT "analysis_jobs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: analysis_jobs analysis_jobs_video_recording_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."analysis_jobs"
    ADD CONSTRAINT "analysis_jobs_video_recording_id_fkey" FOREIGN KEY ("video_recording_id") REFERENCES "public"."video_recordings"("id") ON DELETE CASCADE;


--
-- Name: analysis_metrics analysis_metrics_analysis_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."analysis_metrics"
    ADD CONSTRAINT "analysis_metrics_analysis_id_fkey" FOREIGN KEY ("analysis_id") REFERENCES "public"."analysis_jobs"("id") ON DELETE CASCADE;


--
-- Name: profiles profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: upload_sessions upload_sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."upload_sessions"
    ADD CONSTRAINT "upload_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: upload_sessions upload_sessions_video_recording_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."upload_sessions"
    ADD CONSTRAINT "upload_sessions_video_recording_id_fkey" FOREIGN KEY ("video_recording_id") REFERENCES "public"."video_recordings"("id") ON DELETE CASCADE;


--
-- Name: video_recordings video_recordings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY "public"."video_recordings"
    ADD CONSTRAINT "video_recordings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


--
-- Name: profiles Public profiles are viewable by everyone; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Public profiles are viewable by everyone" ON "public"."profiles" FOR SELECT TO "authenticated", "anon" USING (true);


--
-- Name: analyses Service role can manage all analyses; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Service role can manage all analyses" ON "public"."analyses" TO "service_role" USING (true) WITH CHECK (true);


--
-- Name: analysis_feedback Service role can manage all analysis feedback; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Service role can manage all analysis feedback" ON "public"."analysis_feedback" TO "service_role" USING (true) WITH CHECK (true);


--
-- Name: analysis_jobs Service role can manage all analysis jobs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Service role can manage all analysis jobs" ON "public"."analysis_jobs" TO "service_role" USING (true) WITH CHECK (true);


--
-- Name: analysis_metrics Service role can manage all analysis metrics; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Service role can manage all analysis metrics" ON "public"."analysis_metrics" TO "service_role" USING (true) WITH CHECK (true);


--
-- Name: analysis_audio_segments Service role can manage all audio segments; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Service role can manage all audio segments" ON "public"."analysis_audio_segments" TO "service_role" USING (true) WITH CHECK (true);


--
-- Name: upload_sessions Service role can manage all upload sessions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Service role can manage all upload sessions" ON "public"."upload_sessions" TO "service_role" USING (true) WITH CHECK (true);


--
-- Name: video_recordings Service role can manage all video recordings; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Service role can manage all video recordings" ON "public"."video_recordings" TO "service_role" USING (true) WITH CHECK (true);


--
-- Name: profiles Users can delete their own profile; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete their own profile" ON "public"."profiles" FOR DELETE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));


--
-- Name: upload_sessions Users can delete their own upload sessions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete their own upload sessions" ON "public"."upload_sessions" FOR DELETE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));


--
-- Name: video_recordings Users can delete their own video recordings; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can delete their own video recordings" ON "public"."video_recordings" FOR DELETE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));


--
-- Name: analyses Users can insert analyses for their own jobs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert analyses for their own jobs" ON "public"."analyses" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."analysis_jobs" "aj"
  WHERE (("aj"."id" = "analyses"."job_id") AND ("aj"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));


--
-- Name: analysis_audio_segments Users can insert audio segments for their own analyses; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert audio segments for their own analyses" ON "public"."analysis_audio_segments" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."analyses" "a"
     JOIN "public"."analysis_jobs" "aj" ON (("aj"."id" = "a"."job_id")))
  WHERE (("a"."id" = "analysis_audio_segments"."analysis_id") AND ("aj"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));


--
-- Name: analysis_feedback Users can insert feedback for their own analyses; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert feedback for their own analyses" ON "public"."analysis_feedback" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."analyses" "a"
     JOIN "public"."analysis_jobs" "aj" ON (("aj"."id" = "a"."job_id")))
  WHERE (("a"."id" = "analysis_feedback"."analysis_id") AND ("aj"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));


--
-- Name: analysis_metrics Users can insert metrics for their own analyses; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert metrics for their own analyses" ON "public"."analysis_metrics" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."analysis_jobs" "aj"
  WHERE (("aj"."id" = "analysis_metrics"."analysis_id") AND ("aj"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));


--
-- Name: analysis_jobs Users can insert their own analysis jobs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert their own analysis jobs" ON "public"."analysis_jobs" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));


--
-- Name: profiles Users can insert their own profile; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert their own profile" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));


--
-- Name: upload_sessions Users can insert their own upload sessions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert their own upload sessions" ON "public"."upload_sessions" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));


--
-- Name: video_recordings Users can insert their own video recordings; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can insert their own video recordings" ON "public"."video_recordings" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));


--
-- Name: analyses Users can update analyses for their own jobs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update analyses for their own jobs" ON "public"."analyses" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."analysis_jobs" "aj"
  WHERE (("aj"."id" = "analyses"."job_id") AND ("aj"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."analysis_jobs" "aj"
  WHERE (("aj"."id" = "analyses"."job_id") AND ("aj"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));


--
-- Name: analysis_audio_segments Users can update audio segments for their own analyses; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update audio segments for their own analyses" ON "public"."analysis_audio_segments" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."analyses" "a"
     JOIN "public"."analysis_jobs" "aj" ON (("aj"."id" = "a"."job_id")))
  WHERE (("a"."id" = "analysis_audio_segments"."analysis_id") AND ("aj"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."analyses" "a"
     JOIN "public"."analysis_jobs" "aj" ON (("aj"."id" = "a"."job_id")))
  WHERE (("a"."id" = "analysis_audio_segments"."analysis_id") AND ("aj"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));


--
-- Name: analysis_metrics Users can update metrics for their own analyses; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update metrics for their own analyses" ON "public"."analysis_metrics" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."analysis_jobs" "aj"
  WHERE (("aj"."id" = "analysis_metrics"."analysis_id") AND ("aj"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."analysis_jobs" "aj"
  WHERE (("aj"."id" = "analysis_metrics"."analysis_id") AND ("aj"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));


--
-- Name: analysis_jobs Users can update their own analysis jobs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update their own analysis jobs" ON "public"."analysis_jobs" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));


--
-- Name: profiles Users can update their own profile; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update their own profile" ON "public"."profiles" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));


--
-- Name: upload_sessions Users can update their own upload sessions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update their own upload sessions" ON "public"."upload_sessions" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));


--
-- Name: video_recordings Users can update their own video recordings; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can update their own video recordings" ON "public"."video_recordings" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));


--
-- Name: analyses Users can view analyses for their own jobs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view analyses for their own jobs" ON "public"."analyses" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."analysis_jobs" "aj"
  WHERE (("aj"."id" = "analyses"."job_id") AND ("aj"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));


--
-- Name: analysis_audio_segments Users can view audio segments for their own analyses; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view audio segments for their own analyses" ON "public"."analysis_audio_segments" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."analyses" "a"
     JOIN "public"."analysis_jobs" "aj" ON (("aj"."id" = "a"."job_id")))
  WHERE (("a"."id" = "analysis_audio_segments"."analysis_id") AND ("aj"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));


--
-- Name: analysis_feedback Users can view feedback for their own analyses; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view feedback for their own analyses" ON "public"."analysis_feedback" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."analyses" "a"
     JOIN "public"."analysis_jobs" "aj" ON (("aj"."id" = "a"."job_id")))
  WHERE (("a"."id" = "analysis_feedback"."analysis_id") AND ("aj"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));


--
-- Name: analysis_metrics Users can view metrics for their own analyses; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view metrics for their own analyses" ON "public"."analysis_metrics" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."analysis_jobs" "aj"
  WHERE (("aj"."id" = "analysis_metrics"."analysis_id") AND ("aj"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));


--
-- Name: analysis_jobs Users can view their own analysis jobs; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view their own analysis jobs" ON "public"."analysis_jobs" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));


--
-- Name: upload_sessions Users can view their own upload sessions; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view their own upload sessions" ON "public"."upload_sessions" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));


--
-- Name: video_recordings Users can view their own video recordings; Type: POLICY; Schema: public; Owner: postgres
--

CREATE POLICY "Users can view their own video recordings" ON "public"."video_recordings" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));


--
-- Name: analyses; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."analyses" ENABLE ROW LEVEL SECURITY;

--
-- Name: analysis_audio_segments; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."analysis_audio_segments" ENABLE ROW LEVEL SECURITY;

--
-- Name: analysis_feedback; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."analysis_feedback" ENABLE ROW LEVEL SECURITY;

--
-- Name: analysis_jobs; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."analysis_jobs" ENABLE ROW LEVEL SECURITY;

--
-- Name: analysis_metrics; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."analysis_metrics" ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;

--
-- Name: upload_sessions; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."upload_sessions" ENABLE ROW LEVEL SECURITY;

--
-- Name: video_recordings; Type: ROW SECURITY; Schema: public; Owner: postgres
--

ALTER TABLE "public"."video_recordings" ENABLE ROW LEVEL SECURITY;

--
-- Name: SCHEMA "public"; Type: ACL; Schema: -; Owner: pg_database_owner
--

GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";


--
-- Name: FUNCTION "backfill_analyses_from_jobs"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."backfill_analyses_from_jobs"() TO "anon";
GRANT ALL ON FUNCTION "public"."backfill_analyses_from_jobs"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."backfill_analyses_from_jobs"() TO "service_role";


--
-- Name: FUNCTION "cleanup_expired_upload_sessions"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."cleanup_expired_upload_sessions"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_expired_upload_sessions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_expired_upload_sessions"() TO "service_role";


--
-- Name: FUNCTION "create_analysis_job_on_upload_complete"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."create_analysis_job_on_upload_complete"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_analysis_job_on_upload_complete"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_analysis_job_on_upload_complete"() TO "service_role";


--
-- Name: FUNCTION "get_analysis_with_metrics"("analysis_job_id" bigint); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."get_analysis_with_metrics"("analysis_job_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."get_analysis_with_metrics"("analysis_job_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_analysis_with_metrics"("analysis_job_id" bigint) TO "service_role";


--
-- Name: FUNCTION "get_audio_segments_for_feedback"("feedback_item_id" bigint); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."get_audio_segments_for_feedback"("feedback_item_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."get_audio_segments_for_feedback"("feedback_item_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_audio_segments_for_feedback"("feedback_item_id" bigint) TO "service_role";


--
-- Name: FUNCTION "get_complete_analysis"("p_job_id" bigint); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."get_complete_analysis"("p_job_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."get_complete_analysis"("p_job_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_complete_analysis"("p_job_id" bigint) TO "service_role";


--
-- Name: FUNCTION "get_enhanced_analysis_with_feedback"("analysis_job_id" bigint); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."get_enhanced_analysis_with_feedback"("analysis_job_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."get_enhanced_analysis_with_feedback"("analysis_job_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_enhanced_analysis_with_feedback"("analysis_job_id" bigint) TO "service_role";


--
-- Name: FUNCTION "get_feedback_with_audio"("analysis_job_id" bigint); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."get_feedback_with_audio"("analysis_job_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."get_feedback_with_audio"("analysis_job_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_feedback_with_audio"("analysis_job_id" bigint) TO "service_role";


--
-- Name: FUNCTION "get_upload_progress"("recording_id" bigint); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."get_upload_progress"("recording_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."get_upload_progress"("recording_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_upload_progress"("recording_id" bigint) TO "service_role";


--
-- Name: FUNCTION "handle_new_user"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";


--
-- Name: FUNCTION "handle_updated_at"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "service_role";


--
-- Name: FUNCTION "migrate_results_to_metrics"(); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."migrate_results_to_metrics"() TO "anon";
GRANT ALL ON FUNCTION "public"."migrate_results_to_metrics"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."migrate_results_to_metrics"() TO "service_role";


--
-- Name: FUNCTION "store_analysis_audio_segment"("p_analysis_id" "uuid", "p_feedback_ssml" "text", "p_feedback_audio_url" "text", "p_audio_duration_ms" integer, "p_audio_format" "text", "p_ssml_prompt" "text", "p_audio_prompt" "text"); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."store_analysis_audio_segment"("p_analysis_id" "uuid", "p_feedback_ssml" "text", "p_feedback_audio_url" "text", "p_audio_duration_ms" integer, "p_audio_format" "text", "p_ssml_prompt" "text", "p_audio_prompt" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."store_analysis_audio_segment"("p_analysis_id" "uuid", "p_feedback_ssml" "text", "p_feedback_audio_url" "text", "p_audio_duration_ms" integer, "p_audio_format" "text", "p_ssml_prompt" "text", "p_audio_prompt" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."store_analysis_audio_segment"("p_analysis_id" "uuid", "p_feedback_ssml" "text", "p_feedback_audio_url" "text", "p_audio_duration_ms" integer, "p_audio_format" "text", "p_ssml_prompt" "text", "p_audio_prompt" "text") TO "service_role";


--
-- Name: FUNCTION "store_analysis_results"("analysis_job_id" bigint, "p_summary_text" "text", "p_ssml" "text", "p_audio_url" "text", "p_metrics" "jsonb"); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."store_analysis_results"("analysis_job_id" bigint, "p_summary_text" "text", "p_ssml" "text", "p_audio_url" "text", "p_metrics" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."store_analysis_results"("analysis_job_id" bigint, "p_summary_text" "text", "p_ssml" "text", "p_audio_url" "text", "p_metrics" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."store_analysis_results"("analysis_job_id" bigint, "p_summary_text" "text", "p_ssml" "text", "p_audio_url" "text", "p_metrics" "jsonb") TO "service_role";


--
-- Name: FUNCTION "store_analysis_results"("p_job_id" bigint, "p_full_feedback_text" "text", "p_summary_text" "text", "p_raw_generated_text" "text", "p_full_feedback_json" "jsonb", "p_feedback_prompt" "text"); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."store_analysis_results"("p_job_id" bigint, "p_full_feedback_text" "text", "p_summary_text" "text", "p_raw_generated_text" "text", "p_full_feedback_json" "jsonb", "p_feedback_prompt" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."store_analysis_results"("p_job_id" bigint, "p_full_feedback_text" "text", "p_summary_text" "text", "p_raw_generated_text" "text", "p_full_feedback_json" "jsonb", "p_feedback_prompt" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."store_analysis_results"("p_job_id" bigint, "p_full_feedback_text" "text", "p_summary_text" "text", "p_raw_generated_text" "text", "p_full_feedback_json" "jsonb", "p_feedback_prompt" "text") TO "service_role";


--
-- Name: FUNCTION "store_audio_segment"("p_analysis_feedback_id" bigint, "p_ssml" "text", "p_audio_url" "text", "p_audio_duration_ms" integer, "p_audio_format" "text"); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."store_audio_segment"("p_analysis_feedback_id" bigint, "p_ssml" "text", "p_audio_url" "text", "p_audio_duration_ms" integer, "p_audio_format" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."store_audio_segment"("p_analysis_feedback_id" bigint, "p_ssml" "text", "p_audio_url" "text", "p_audio_duration_ms" integer, "p_audio_format" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."store_audio_segment"("p_analysis_feedback_id" bigint, "p_ssml" "text", "p_audio_url" "text", "p_audio_duration_ms" integer, "p_audio_format" "text") TO "service_role";


--
-- Name: FUNCTION "store_enhanced_analysis_results"("analysis_job_id" bigint, "p_full_feedback_text" "text", "p_summary_text" "text", "p_ssml" "text", "p_audio_url" "text", "p_processing_time_ms" bigint, "p_video_source_type" "text", "p_feedback" "jsonb", "p_metrics" "jsonb"); Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON FUNCTION "public"."store_enhanced_analysis_results"("analysis_job_id" bigint, "p_full_feedback_text" "text", "p_summary_text" "text", "p_ssml" "text", "p_audio_url" "text", "p_processing_time_ms" bigint, "p_video_source_type" "text", "p_feedback" "jsonb", "p_metrics" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."store_enhanced_analysis_results"("analysis_job_id" bigint, "p_full_feedback_text" "text", "p_summary_text" "text", "p_ssml" "text", "p_audio_url" "text", "p_processing_time_ms" bigint, "p_video_source_type" "text", "p_feedback" "jsonb", "p_metrics" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."store_enhanced_analysis_results"("analysis_job_id" bigint, "p_full_feedback_text" "text", "p_summary_text" "text", "p_ssml" "text", "p_audio_url" "text", "p_processing_time_ms" bigint, "p_video_source_type" "text", "p_feedback" "jsonb", "p_metrics" "jsonb") TO "service_role";


--
-- Name: TABLE "analyses"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."analyses" TO "anon";
GRANT ALL ON TABLE "public"."analyses" TO "authenticated";
GRANT ALL ON TABLE "public"."analyses" TO "service_role";


--
-- Name: TABLE "analysis_audio_segments"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."analysis_audio_segments" TO "anon";
GRANT ALL ON TABLE "public"."analysis_audio_segments" TO "authenticated";
GRANT ALL ON TABLE "public"."analysis_audio_segments" TO "service_role";


--
-- Name: SEQUENCE "analysis_audio_segments_id_seq"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE "public"."analysis_audio_segments_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."analysis_audio_segments_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."analysis_audio_segments_id_seq" TO "service_role";


--
-- Name: TABLE "analysis_feedback"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."analysis_feedback" TO "anon";
GRANT ALL ON TABLE "public"."analysis_feedback" TO "authenticated";
GRANT ALL ON TABLE "public"."analysis_feedback" TO "service_role";


--
-- Name: SEQUENCE "analysis_feedback_id_seq"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE "public"."analysis_feedback_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."analysis_feedback_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."analysis_feedback_id_seq" TO "service_role";


--
-- Name: TABLE "analysis_jobs"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."analysis_jobs" TO "anon";
GRANT ALL ON TABLE "public"."analysis_jobs" TO "authenticated";
GRANT ALL ON TABLE "public"."analysis_jobs" TO "service_role";


--
-- Name: SEQUENCE "analysis_jobs_id_seq"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE "public"."analysis_jobs_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."analysis_jobs_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."analysis_jobs_id_seq" TO "service_role";


--
-- Name: TABLE "analysis_metrics"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."analysis_metrics" TO "anon";
GRANT ALL ON TABLE "public"."analysis_metrics" TO "authenticated";
GRANT ALL ON TABLE "public"."analysis_metrics" TO "service_role";


--
-- Name: SEQUENCE "analysis_metrics_id_seq"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE "public"."analysis_metrics_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."analysis_metrics_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."analysis_metrics_id_seq" TO "service_role";


--
-- Name: TABLE "profiles"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";


--
-- Name: SEQUENCE "profiles_id_seq"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE "public"."profiles_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."profiles_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."profiles_id_seq" TO "service_role";


--
-- Name: TABLE "upload_sessions"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."upload_sessions" TO "anon";
GRANT ALL ON TABLE "public"."upload_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."upload_sessions" TO "service_role";


--
-- Name: SEQUENCE "upload_sessions_id_seq"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE "public"."upload_sessions_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."upload_sessions_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."upload_sessions_id_seq" TO "service_role";


--
-- Name: TABLE "video_recordings"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON TABLE "public"."video_recordings" TO "anon";
GRANT ALL ON TABLE "public"."video_recordings" TO "authenticated";
GRANT ALL ON TABLE "public"."video_recordings" TO "service_role";


--
-- Name: SEQUENCE "video_recordings_id_seq"; Type: ACL; Schema: public; Owner: postgres
--

GRANT ALL ON SEQUENCE "public"."video_recordings_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."video_recordings_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."video_recordings_id_seq" TO "service_role";


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

-- ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
-- ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
-- ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
-- ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

-- ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
-- ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
-- ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
-- ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: supabase_admin
--

-- ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
-- ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
-- ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
-- ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";


--
-- PostgreSQL database dump complete
--

RESET ALL;
