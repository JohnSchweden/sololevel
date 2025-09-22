-- Add MIME type and file extension validation for processed bucket
-- Enforce strict audio file types only (for now)

-- Function to enforce processed file validation
CREATE OR REPLACE FUNCTION public.enforce_processed_mime_whitelist()
RETURNS trigger LANGUAGE plpgsql AS $$
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
END $$;

-- Create trigger to validate on insert/update
DROP TRIGGER IF EXISTS trg_processed_mime_whitelist ON storage.objects;
CREATE TRIGGER trg_processed_mime_whitelist
BEFORE INSERT OR UPDATE ON storage.objects
FOR EACH ROW EXECUTE FUNCTION public.enforce_processed_mime_whitelist();
