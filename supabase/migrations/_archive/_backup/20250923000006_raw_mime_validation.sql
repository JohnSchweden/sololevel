-- Add MIME type and file extension validation for raw bucket
-- Enforce strict video file types only

-- Function to enforce video file validation
CREATE OR REPLACE FUNCTION public.enforce_video_mime_whitelist()
RETURNS trigger LANGUAGE plpgsql AS $$
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
END $$;

-- Create trigger to validate on insert/update
DROP TRIGGER IF EXISTS trg_raw_mime_whitelist ON storage.objects;
CREATE TRIGGER trg_raw_mime_whitelist
BEFORE INSERT OR UPDATE ON storage.objects
FOR EACH ROW EXECUTE FUNCTION public.enforce_video_mime_whitelist();
