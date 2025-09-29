-- Add unique constraint on video_recording_id in analysis_jobs table
-- Ensures one analysis job per video recording (required for trigger ON CONFLICT logic)

alter table public.analysis_jobs
  add constraint analysis_jobs_video_recording_id_key unique (video_recording_id);
