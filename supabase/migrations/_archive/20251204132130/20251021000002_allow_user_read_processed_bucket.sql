-- Migration: Add SELECT policy for authenticated users on processed bucket
-- Task 32 audio playback fix: Users need to generate signed URLs for their own audio
-- Date: 2025-10-21
--
-- Allows authenticated users to SELECT (read metadata for) their own files in processed bucket.
-- Required for generating signed download URLs from client.
-- Files path format: {user_id}/videos/{yyyymmdd}/{video_id}/audio/...
-- Users can only access files in their own user_id folder.

CREATE POLICY "Users can read own processed files" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'processed' AND
  auth.role() = 'authenticated' AND
  coalesce((storage.foldername(name))[1], '') = auth.uid()::text
);

