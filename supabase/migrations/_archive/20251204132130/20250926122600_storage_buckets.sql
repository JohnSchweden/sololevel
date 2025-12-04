-- Consolidated storage setup for 'raw' and 'processed' buckets with idempotent policies

-- Buckets (idempotent via upsert)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'raw',
  'raw',
  false,
  524288000, -- 500 MiB in bytes
  ARRAY['video/mp4', 'video/quicktime']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'processed',
  'processed',
  false,
  104857600, -- 100 MiB in bytes
  ARRAY['audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/wave']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Drop existing policies if present to avoid duplicates
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Service role can manage raw files'
  ) THEN
    DROP POLICY "Service role can manage raw files" ON storage.objects;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Users can upload to own raw folder'
  ) THEN
    DROP POLICY "Users can upload to own raw folder" ON storage.objects;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Users can manage own raw files'
  ) THEN
    DROP POLICY "Users can manage own raw files" ON storage.objects;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Service role can manage processed files'
  ) THEN
    DROP POLICY "Service role can manage processed files" ON storage.objects;
  END IF;
END
$$;

-- Recreate policies (authoritative definitions)

-- Raw: service role full management
CREATE POLICY "Service role can manage raw files" ON storage.objects
FOR ALL TO service_role
USING (bucket_id = 'raw')
WITH CHECK (bucket_id = 'raw');

-- Raw: authenticated users can upload to their own top-level folder (<uid>/...)
CREATE POLICY "Users can upload to own raw folder" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'raw' AND
  auth.role() = 'authenticated' AND
  coalesce((storage.foldername(name))[1], '') = auth.uid()::text
);

-- Raw: authenticated users can manage (read/update/delete) their own files
CREATE POLICY "Users can manage own raw files" ON storage.objects
FOR ALL TO authenticated
USING (
  bucket_id = 'raw' AND
  auth.role() = 'authenticated' AND
  coalesce((storage.foldername(name))[1], '') = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'raw' AND
  auth.role() = 'authenticated' AND
  coalesce((storage.foldername(name))[1], '') = auth.uid()::text
);

-- Processed: service role only (Edge Functions use signed URLs)
CREATE POLICY "Service role can manage processed files" ON storage.objects
FOR ALL TO service_role
USING (bucket_id = 'processed')
WITH CHECK (bucket_id = 'processed');


