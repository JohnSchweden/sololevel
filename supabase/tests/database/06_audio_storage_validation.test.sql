-- Audio Storage Validation Tests
-- Tests MIME type and file extension validation for audio bucket

begin;
select plan(9);

-- Test that the processed bucket configuration is correct
select ok(
  exists(
    select 1 from storage.buckets
    where id = 'processed'
    and "public" = false
    and file_size_limit = 104857600
    and 'audio/mpeg' = any(allowed_mime_types)
    and 'audio/wav' = any(allowed_mime_types)
  ),
  'Processed bucket should be properly configured for audio files'
);

-- Test that the processed bucket has correct MIME types configured for audio
select ok(
  exists(
    select 1 from storage.buckets
    where id = 'processed'
    and "public" = false
    and 'audio/mpeg' = any(allowed_mime_types)
    and 'audio/wav' = any(allowed_mime_types)
    and 'audio/x-wav' = any(allowed_mime_types)
    and 'audio/wave' = any(allowed_mime_types)
  ),
  'Processed bucket should be private and allow only WAV/MP3 MIME types'
);

-- Test that the processed bucket RLS policy exists
select ok(
  exists(
    select 1 from pg_policies
    where schemaname = 'storage'
    and tablename = 'objects'
    and policyname = 'Service role can manage processed files'
  ),
  'Processed bucket RLS policy should exist'
);

-- Test that processed bucket rejects invalid MIME types (via bucket configuration)
select ok(
  not exists(
    select 1 from storage.buckets
    where id = 'processed'
    and 'image/png' = any(allowed_mime_types)
  ),
  'Processed bucket should not allow image/png MIME type'
);

-- Test that processed bucket rejects invalid file extensions (via configuration check)
select ok(
  not exists(
    select 1 from storage.buckets
    where id = 'processed'
    and 'video/mp4' = any(allowed_mime_types)
  ),
  'Processed bucket should not allow video/mp4 MIME type'
);

-- Test that processed bucket allows all expected audio MIME types
select ok(
  exists(
    select 1 from storage.buckets
    where id = 'processed'
    and array_length(allowed_mime_types, 1) = 4
    and 'audio/mpeg' = any(allowed_mime_types)
    and 'audio/wav' = any(allowed_mime_types)
    and 'audio/x-wav' = any(allowed_mime_types)
    and 'audio/wave' = any(allowed_mime_types)
  ),
  'Processed bucket should allow all expected audio MIME types'
);

-- Test that raw bucket has different allowed types than processed
select ok(
  exists(
    select 1 from storage.buckets b1, storage.buckets b2
    where b1.id = 'raw' and b2.id = 'processed'
    and b1.allowed_mime_types != b2.allowed_mime_types
  ),
  'Raw and processed buckets should have different allowed MIME types'
);

-- Test that raw bucket allows video types
select ok(
  exists(
    select 1 from storage.buckets
    where id = 'raw'
    and 'video/mp4' = any(allowed_mime_types)
    and 'video/quicktime' = any(allowed_mime_types)
  ),
  'Raw bucket should allow video MIME types'
);

-- Test that raw bucket has upload policies for authenticated users
select ok(
  exists(
    select 1 from pg_policies
    where schemaname = 'storage'
    and tablename = 'objects'
    and policyname = 'Users can upload to own raw folder'
  ),
  'Raw bucket should have user upload policy'
);

select * from finish();
rollback;
