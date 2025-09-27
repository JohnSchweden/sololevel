-- Adjust feedback relationships: connect analysis_feedback to analyses table
-- and remove feedback columns from analysis_jobs

-- 1. Drop existing RLS policies that depend on analysis_id column
drop policy if exists "Users can view feedback for their own analyses" on public.analysis_feedback;
drop policy if exists "Users can insert feedback for their own analyses" on public.analysis_feedback;

-- 2. Change analysis_feedback foreign key to reference analyses instead of analysis_jobs
-- Since we're working with a fresh database, we can drop and recreate the column
alter table public.analysis_feedback
drop constraint analysis_feedback_analysis_id_fkey,
alter column analysis_id type uuid using null,
add constraint analysis_feedback_analysis_id_fkey
  foreign key (analysis_id) references public.analyses(id) on delete cascade;

-- 3. Update RLS policies for analysis_feedback to use analyses ownership

create policy "Users can view feedback for their own analyses"
  on public.analysis_feedback for select
  to authenticated
  using (
    exists (
      select 1 from public.analyses a
      join public.analysis_jobs aj on aj.id = a.job_id
      where a.id = analysis_feedback.analysis_id
      and aj.user_id = (select auth.uid())
    )
  );

create policy "Users can insert feedback for their own analyses"
  on public.analysis_feedback for insert
  to authenticated
  with check (
    exists (
      select 1 from public.analyses a
      join public.analysis_jobs aj on aj.id = a.job_id
      where a.id = analysis_feedback.analysis_id
      and aj.user_id = (select auth.uid())
    )
  );

-- 3. Remove feedback columns from analysis_jobs table
alter table public.analysis_jobs
drop column if exists full_feedback_text,
drop column if exists summary_text,
drop column if exists ssml,
drop column if exists audio_url;

-- 4. Update functions that reference the removed columns
create or replace function public.store_enhanced_analysis_results(
  analysis_job_id bigint,
  p_full_feedback_text text default null, -- Keep parameter for backward compatibility but don't store
  p_summary_text text default null,
  p_ssml text default null,
  p_audio_url text default null,
  p_processing_time_ms bigint default null,
  p_video_source_type text default null,
  p_feedback jsonb default '[]'::jsonb,
  p_metrics jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
as $$
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

-- 5. Update get_enhanced_analysis_with_feedback function
drop function if exists public.get_enhanced_analysis_with_feedback(bigint);
create function public.get_enhanced_analysis_with_feedback(analysis_job_id bigint)
returns table (
  analysis_id bigint,
  status text,
  progress_percentage integer,
  processing_time_ms bigint,
  video_source_type text,
  created_at timestamptz,
  updated_at timestamptz,
  feedback jsonb,
  metrics jsonb,
  analyses jsonb -- New field containing analysis results
)
language plpgsql
security definer
as $$
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

-- 6. Update the backfill function to handle the new relationships
create or replace function public.backfill_analyses_from_jobs()
returns void
language plpgsql
security definer
as $$
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
