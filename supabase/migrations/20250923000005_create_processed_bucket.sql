-- Create private 'processed' bucket for AI-generated artifacts
-- This bucket will store processed audio, thumbnails, and other derived content
-- Only service role can access (Edge Functions generate and serve via signed URLs)

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'processed',
  'processed',
  false,
  104857600, -- 100 MiB in bytes
  ARRAY['audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/wave']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 104857600,
  allowed_mime_types = ARRAY['audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/wave'];

-- Create storage policies for the processed bucket
-- Only service role can manage processed files (Edge Functions)
-- No client-side access - all access via signed URLs

CREATE POLICY "Service role can manage processed files" ON storage.objects
FOR ALL TO service_role
USING (bucket_id = 'processed')
WITH CHECK (bucket_id = 'processed');

-- Note: No SELECT policies for authenticated users
-- All access must go through Edge Functions and signed URLs
