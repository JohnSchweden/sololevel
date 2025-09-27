-- Check auth.users table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'auth' AND table_name = 'users'
ORDER BY ordinal_position;

-- Check storage.buckets table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'storage' AND table_name = 'buckets'
ORDER BY ordinal_position;

-- Check if analysis_jobs and analysis_metrics tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public' AND table_name IN ('analysis_jobs', 'analysis_metrics', 'video_recordings');
