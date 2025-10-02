-- Enable realtime for analysis_jobs table
-- This fixes CHANNEL_ERROR when subscribing to analysis job updates

-- Add analysis_jobs table to the supabase_realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE analysis_jobs;

-- Also add video_recordings for testing
ALTER PUBLICATION supabase_realtime ADD TABLE video_recordings;

-- Verify the tables were added (this is just for confirmation, will show in logs)
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime' AND tablename IN ('analysis_jobs', 'video_recordings');
