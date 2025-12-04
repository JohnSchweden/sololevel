-- Add title parameter to store_analysis_results RPC function
-- This migration updates store_analysis_results to accept and store the title field

drop function if exists public.store_analysis_results(bigint, text, text, text, jsonb, text);

create or replace function public.store_analysis_results(
  p_job_id bigint,
  p_full_feedback_text text default null,
  p_summary_text text default null,
  p_raw_generated_text text default null,
  p_full_feedback_json jsonb default null,
  p_feedback_prompt text default null,
  p_title text default null
)
returns uuid
language plpgsql
security definer
as $$
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

