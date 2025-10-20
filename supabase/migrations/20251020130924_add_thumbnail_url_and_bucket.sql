-- Add thumbnail_url column to video_recordings table
-- Create public thumbnails bucket for CDN-backed delivery

-- Add thumbnail_url column to video_recordings
ALTER TABLE public.video_recordings 
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- Add index for query performance
CREATE INDEX IF NOT EXISTS idx_video_recordings_thumbnail_url 
ON public.video_recordings(thumbnail_url) 
WHERE thumbnail_url IS NOT NULL;

-- Add column comment
COMMENT ON COLUMN public.video_recordings.thumbnail_url IS 
'Public URL to video thumbnail in Supabase Storage (thumbnails bucket)';

-- Create thumbnails bucket (idempotent via upsert)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'thumbnails',
  'thumbnails',
  true, -- Public for CDN delivery
  10485760, -- 10 MiB limit (thumbnails are small)
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/avif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Drop existing thumbnails bucket policies if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Users can upload thumbnails to own folder'
  ) THEN
    DROP POLICY "Users can upload thumbnails to own folder" ON storage.objects;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Service role can manage thumbnails'
  ) THEN
    DROP POLICY "Service role can manage thumbnails" ON storage.objects;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Public read access for thumbnails'
  ) THEN
    DROP POLICY "Public read access for thumbnails" ON storage.objects;
  END IF;
END
$$;

-- Create policies for thumbnails bucket

-- Service role can manage all thumbnails
CREATE POLICY "Service role can manage thumbnails" ON storage.objects
FOR ALL TO service_role
USING (bucket_id = 'thumbnails')
WITH CHECK (bucket_id = 'thumbnails');

-- Authenticated users can upload thumbnails to their own folder
CREATE POLICY "Users can upload thumbnails to own folder" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'thumbnails' AND
  auth.role() = 'authenticated' AND
  coalesce((storage.foldername(name))[1], '') = auth.uid()::text
);

-- Public read access for all thumbnails (CDN delivery)
CREATE POLICY "Public read access for thumbnails" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'thumbnails');

