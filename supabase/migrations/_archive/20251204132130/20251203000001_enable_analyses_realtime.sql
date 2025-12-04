-- Enable realtime for analyses table
-- This allows title updates to be pushed to clients via postgres_changes subscription
-- Fixes the "fake realtime" polling workaround that was causing 10,000+ list_changes calls

-- Add analyses table to the supabase_realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE analyses;

-- Verify the table was added (this is just for confirmation, will show in logs)
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime' AND tablename = 'analyses';

