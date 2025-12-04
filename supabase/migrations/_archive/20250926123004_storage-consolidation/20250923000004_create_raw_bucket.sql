-- Create private 'raw' bucket for video uploads
-- This bucket will store original user-uploaded videos with user-scoped access control

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'raw',
  'raw',
  false,
  524288000, -- 500 MiB in bytes
  ARRAY['video/mp4', 'video/quicktime']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 524288000,
  allowed_mime_types = ARRAY['video/mp4', 'video/quicktime'];

-- Create storage policies for the raw bucket
-- Service role can manage all files (for processing/cleanup)
-- Authenticated users can only access their own folder

CREATE POLICY "Service role can manage raw files" ON storage.objects
FOR ALL TO service_role
USING (bucket_id = 'raw')
WITH CHECK (bucket_id = 'raw');

-- Users can upload to their own raw folder
CREATE POLICY "Users can upload to own raw folder" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'raw' AND
  auth.role() = 'authenticated' AND
  (storage.foldername(name))[1] = 'raw' AND
  (storage.foldername(name))[2] = auth.uid()::text
);

-- Users can read/update/delete their own raw files
CREATE POLICY "Users can manage own raw files" ON storage.objects
FOR ALL TO authenticated
USING (
  bucket_id = 'raw' AND
  auth.role() = 'authenticated' AND
  (storage.foldername(name))[1] = 'raw' AND
  (storage.foldername(name))[2] = auth.uid()::text
);
