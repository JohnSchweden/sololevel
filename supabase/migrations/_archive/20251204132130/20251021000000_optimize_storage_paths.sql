-- Migration: Optimize Storage Paths - Database IDs + Date Partitioning
-- Task 32 Module 1: Add storage_path column to analysis_audio_segments
-- Date: 2025-10-21

-- Update video_recordings comment with new format
COMMENT ON COLUMN public.video_recordings.storage_path IS 
'Storage path format: {user_id}/videos/{yyyymmdd}/{video_recording_id}/video.{format}
Date extracted from created_at (UTC). Video-centric grouping for all related assets. Example: 488a7161.../videos/20251014/1234/video.mp4';

-- Add storage_path to analysis_audio_segments
ALTER TABLE public.analysis_audio_segments 
ADD COLUMN storage_path TEXT;

-- Add index for query performance
CREATE INDEX idx_audio_segments_storage_path 
ON public.analysis_audio_segments(storage_path) 
WHERE storage_path IS NOT NULL;

-- Add comment
COMMENT ON COLUMN public.analysis_audio_segments.storage_path IS 
'Storage path format: {user_id}/videos/{yyyymmdd}/{video_recording_id}/audio/{feedback_id}/{segment_index}.{format}
Date extracted from video_recordings.created_at (UTC). Groups audio with video assets. Example: 488a7161.../videos/20251014/1234/audio/1069/0.wav';

