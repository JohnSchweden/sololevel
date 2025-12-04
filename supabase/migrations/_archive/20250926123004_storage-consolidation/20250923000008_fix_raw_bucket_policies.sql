-- Fix raw bucket policies to match actual storage path structure

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Users can upload to own raw folder'
  ) THEN
    DROP POLICY "Users can upload to own raw folder" ON storage.objects;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Users can manage own raw files'
  ) THEN
    DROP POLICY "Users can manage own raw files" ON storage.objects;
  END IF;
END
$$;

CREATE POLICY "Users can upload to own raw folder" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'raw' AND
  auth.role() = 'authenticated' AND
  coalesce((storage.foldername(name))[1], '') = auth.uid()::text
);

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

