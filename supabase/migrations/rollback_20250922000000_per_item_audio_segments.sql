-- Rollback Per-Item Audio Segments Schema
-- This migration removes the analysis_audio_segments table and related functions

-- Drop functions first
drop function if exists public.get_audio_segments_for_feedback(bigint);
drop function if exists public.get_feedback_with_audio(bigint);
drop function if exists public.store_audio_segment(bigint, text, text, int, text);

-- Drop policies
drop policy if exists "Service role can manage all audio segments" on public.analysis_audio_segments;
drop policy if exists "Users can update audio segments for their own analyses" on public.analysis_audio_segments;
drop policy if exists "Users can insert audio segments for their own analyses" on public.analysis_audio_segments;
drop policy if exists "Users can view audio segments for their own analyses" on public.analysis_audio_segments;

-- Drop indexes
drop index if exists analysis_audio_segments_feedback_format_idx;
drop index if exists analysis_audio_segments_format_idx;
drop index if exists analysis_audio_segments_created_at_idx;
drop index if exists analysis_audio_segments_feedback_id_idx;

-- Drop table
drop table if exists public.analysis_audio_segments;
