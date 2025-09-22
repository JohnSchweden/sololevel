-- Rollback Migration for Phase 1: TRD Alignment
-- This file documents how to rollback the Phase 1 TRD alignment changes
-- Run these commands in reverse order to undo the migration

-- WARNING: This will permanently delete data in analysis_metrics table
-- Make sure to backup data before running rollback

-- 1. Drop functions
drop function if exists public.store_analysis_results(bigint, text, text, text, jsonb);
drop function if exists public.get_analysis_with_metrics(bigint);
drop function if exists public.migrate_results_to_metrics();

-- 2. Drop service role policies
drop policy if exists "Service role can manage all upload sessions" on public.upload_sessions;
drop policy if exists "Service role can manage all video recordings" on public.video_recordings;
drop policy if exists "Service role can manage all analysis metrics" on public.analysis_metrics;
drop policy if exists "Service role can manage all analysis jobs" on public.analysis_jobs;

-- 3. Drop analysis_metrics table (this will delete all metric data)
drop table if exists public.analysis_metrics cascade;

-- 4. Remove TTS/Audio fields from analysis_jobs table
alter table public.analysis_jobs 
drop column if exists audio_url,
drop column if exists ssml,
drop column if exists summary_text;

-- Note: To preserve existing data, you may want to:
-- 1. Export analysis_metrics data before dropping the table
-- 2. Migrate TTS/Audio field data back to JSONB results column
-- 3. Create a backup of the database before running rollback

-- Example data preservation (run before rollback):
-- create table analysis_metrics_backup as select * from public.analysis_metrics;
-- update public.analysis_jobs set results = results || jsonb_build_object(
--   'summary_text', summary_text,
--   'ssml', ssml, 
--   'audio_url', audio_url
-- ) where summary_text is not null or ssml is not null or audio_url is not null;
