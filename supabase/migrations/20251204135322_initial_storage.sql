-- Initial storage setup: buckets, policies, and triggers
-- Consolidated from all storage-related migrations

-- Create storage schema if not exists
CREATE SCHEMA IF NOT EXISTS "storage";

ALTER SCHEMA "storage" OWNER TO "supabase_admin";

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

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Users can read own processed files'
  ) THEN
    DROP POLICY "Users can read own processed files" ON storage.objects;
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
      AND policyname = 'Users can upload thumbnails to own folder'
  ) THEN
    DROP POLICY "Users can upload thumbnails to own folder" ON storage.objects;
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

-- Storage policies

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

-- Processed: authenticated users can read metadata for signed URL generation
CREATE POLICY "Users can read own processed files" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'processed' AND
  auth.role() = 'authenticated' AND
  coalesce((storage.foldername(name))[1], '') = auth.uid()::text
);

-- Thumbnails: service role full management
CREATE POLICY "Service role can manage thumbnails" ON storage.objects
FOR ALL TO service_role
USING (bucket_id = 'thumbnails')
WITH CHECK (bucket_id = 'thumbnails');

-- Thumbnails: authenticated users can upload to their own folder
CREATE POLICY "Users can upload thumbnails to own folder" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'thumbnails' AND
  auth.role() = 'authenticated' AND
  coalesce((storage.foldername(name))[1], '') = auth.uid()::text
);

-- Thumbnails: public read access for CDN delivery
CREATE POLICY "Public read access for thumbnails" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'thumbnails');

-- Storage trigger: finalize video recordings on raw object creation
CREATE OR REPLACE FUNCTION public.finalize_video_on_raw_object()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
declare
  affected_rows int;
begin
  -- Only for raw bucket (compare id directly)
  if new.bucket_id <> 'raw' then
    return new;
  end if;

  raise notice 'TRIGGER: Processing raw bucket object: %', new.name;

  -- Mark matching video_recordings as completed, idempotent
  update public.video_recordings
    set upload_status = 'completed',
        upload_progress = 100,
        updated_at = now()
  where storage_path = new.name
    and upload_status <> 'completed';

  get diagnostics affected_rows = row_count;
  raise notice 'TRIGGER: Updated % video_recordings rows for path: %', affected_rows, new.name;

  return new;
end;
$$;

ALTER FUNCTION public.finalize_video_on_raw_object() OWNER TO postgres;

COMMENT ON FUNCTION public.finalize_video_on_raw_object() IS 'Finalizes video_recordings on raw storage object creation';

-- Create trigger (idempotent: drop if exists first)
DROP TRIGGER IF EXISTS trg_finalize_video_on_raw_object ON storage.objects;
CREATE TRIGGER trg_finalize_video_on_raw_object
AFTER INSERT ON storage.objects
FOR EACH ROW EXECUTE FUNCTION public.finalize_video_on_raw_object();

-- Storage MIME type enforcement triggers
CREATE OR REPLACE FUNCTION public.enforce_video_mime_whitelist()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $_$
DECLARE
  ext text := lower(regexp_replace(new.name, '.*(\.[^.]+)$', '\1'));
  mime text := lower(coalesce(new.metadata->>'mimetype',''));
  inferred_mime text;
BEGIN
  -- Only enforce for raw bucket
  IF new.bucket_id = 'raw' THEN
    -- Check file extension
    IF ext NOT IN ('.mp4', '.mov') THEN
      RAISE EXCEPTION 'raw bucket only accepts .mp4 or .mov files';
    END IF;

    -- Infer MIME type from file extension since metadata might not be set correctly
    CASE ext
      WHEN '.mp4' THEN inferred_mime := 'video/mp4';
      WHEN '.mov' THEN inferred_mime := 'video/quicktime';
      ELSE inferred_mime := 'application/octet-stream';
    END CASE;

    -- Set the mimetype in metadata if it's not already set
    IF mime = '' THEN
      new.metadata := jsonb_set(coalesce(new.metadata, '{}'), '{mimetype}', to_jsonb(inferred_mime));
      RAISE NOTICE 'Set mimetype in metadata for %: %', new.name, inferred_mime;
    END IF;

    -- Now check the MIME type (either original or inferred)
    mime := lower(coalesce(new.metadata->>'mimetype', ''));
    IF mime NOT IN ('video/mp4','video/quicktime') THEN
      RAISE EXCEPTION 'raw bucket only accepts video/mp4 or video/quicktime mimetypes (got: %)', mime;
    END IF;
  END IF;

  RETURN new;
END $_$;

ALTER FUNCTION public.enforce_video_mime_whitelist() OWNER TO postgres;

CREATE OR REPLACE FUNCTION public.enforce_processed_mime_whitelist()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $_$
DECLARE
  ext text := lower(regexp_replace(new.name, '.*(\.[^.]+)$', '\1'));
  mime text := lower(coalesce(new.metadata->>'mimetype',''));
  inferred_mime text;
BEGIN
  -- Only enforce for processed bucket
  IF new.bucket_id = 'processed' THEN
    -- Check file extension (for now, only audio files)
    IF ext NOT IN ('.mp3', '.wav') THEN
      RAISE EXCEPTION 'processed bucket currently only accepts .mp3 or .wav files';
    END IF;

    -- Infer MIME type from file extension since metadata might not be set correctly
    CASE ext
      WHEN '.wav' THEN inferred_mime := 'audio/wav';
      WHEN '.mp3' THEN inferred_mime := 'audio/mpeg';
      ELSE inferred_mime := 'application/octet-stream';
    END CASE;

    -- Set the mimetype in metadata if it's not already set
    IF mime = '' THEN
      new.metadata := jsonb_set(coalesce(new.metadata, '{}'), '{mimetype}', to_jsonb(inferred_mime));
      RAISE NOTICE 'Set mimetype in metadata for %: %', new.name, inferred_mime;
    END IF;

    -- Now check the MIME type (either original or inferred)
    mime := lower(coalesce(new.metadata->>'mimetype', ''));
    IF mime NOT IN ('audio/mpeg','audio/wav','audio/x-wav','audio/wave') THEN
      RAISE EXCEPTION 'processed bucket currently only accepts audio mimetypes (got: %)', mime;
    END IF;
  END IF;

  RETURN new;
END $_$;

ALTER FUNCTION public.enforce_processed_mime_whitelist() OWNER TO postgres;

-- Create MIME enforcement triggers (idempotent)
DROP TRIGGER IF EXISTS enforce_video_mime_whitelist ON storage.objects;
CREATE TRIGGER enforce_video_mime_whitelist
BEFORE INSERT OR UPDATE ON storage.objects
FOR EACH ROW EXECUTE FUNCTION public.enforce_video_mime_whitelist();

DROP TRIGGER IF EXISTS enforce_processed_mime_whitelist ON storage.objects;
CREATE TRIGGER enforce_processed_mime_whitelist
BEFORE INSERT OR UPDATE ON storage.objects
FOR EACH ROW EXECUTE FUNCTION public.enforce_processed_mime_whitelist();

