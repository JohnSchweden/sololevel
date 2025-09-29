-- Test suite for SSML/Audio segments migration
-- Tests the separation of SSML and audio segments with status tracking on feedback

BEGIN;

-- Load pgtap extension
SELECT plan(38);

-- Disable RLS for testing
SET row_security = off;

-- Create test user for foreign key constraints (use unique email)
INSERT INTO auth.users (id, email, created_at, updated_at)
VALUES ('550e8400-e29b-41d4-a716-446655440000'::uuid, 'ssml-test@example.com', now(), now())
ON CONFLICT (id) DO NOTHING;

-- Test 1: Verify analysis_ssml_segments table exists with correct structure
SELECT has_table('public', 'analysis_ssml_segments', 'analysis_ssml_segments table should exist');

SELECT has_column('public', 'analysis_ssml_segments', 'id', 'analysis_ssml_segments should have id column');
SELECT has_column('public', 'analysis_ssml_segments', 'feedback_id', 'analysis_ssml_segments should have feedback_id column');
SELECT has_column('public', 'analysis_ssml_segments', 'segment_index', 'analysis_ssml_segments should have segment_index column');
SELECT has_column('public', 'analysis_ssml_segments', 'ssml', 'analysis_ssml_segments should have ssml column');
SELECT has_column('public', 'analysis_ssml_segments', 'provider', 'analysis_ssml_segments should have provider column');
SELECT has_column('public', 'analysis_ssml_segments', 'version', 'analysis_ssml_segments should have version column');
SELECT has_column('public', 'analysis_ssml_segments', 'created_at', 'analysis_ssml_segments should have created_at column');
SELECT has_column('public', 'analysis_ssml_segments', 'ssml_prompt', 'analysis_ssml_segments should have ssml_prompt column');

-- Test 2: Verify unique constraint on feedback_id, segment_index
SELECT has_index('public', 'analysis_ssml_segments', 'analysis_ssml_segments_feedback_id_segment_index_key', 'Should have unique index on feedback_id, segment_index');

-- Test 3: Verify analysis_feedback has status columns
SELECT has_column('public', 'analysis_feedback', 'ssml_status', 'analysis_feedback should have ssml_status column');
SELECT has_column('public', 'analysis_feedback', 'audio_status', 'analysis_feedback should have audio_status column');

-- Test 4: Verify feedback has attempt/error tracking columns
SELECT has_column('public', 'analysis_feedback', 'ssml_attempts', 'analysis_feedback should have ssml_attempts column');
SELECT has_column('public', 'analysis_feedback', 'audio_attempts', 'analysis_feedback should have audio_attempts column');
SELECT has_column('public', 'analysis_feedback', 'ssml_last_error', 'analysis_feedback should have ssml_last_error column');
SELECT has_column('public', 'analysis_feedback', 'audio_last_error', 'analysis_feedback should have audio_last_error column');

-- Test 6: Verify analysis_audio_segments has correct structure
SELECT has_table('public', 'analysis_audio_segments', 'analysis_audio_segments table should exist');

SELECT has_column('public', 'analysis_audio_segments', 'id', 'analysis_audio_segments should have id column');
SELECT has_column('public', 'analysis_audio_segments', 'feedback_id', 'analysis_audio_segments should have feedback_id column');
SELECT has_column('public', 'analysis_audio_segments', 'audio_url', 'analysis_audio_segments should have audio_url column');
SELECT has_column('public', 'analysis_audio_segments', 'duration_ms', 'analysis_audio_segments should have duration_ms column');
SELECT has_column('public', 'analysis_audio_segments', 'format', 'analysis_audio_segments should have format column');
SELECT has_column('public', 'analysis_audio_segments', 'provider', 'analysis_audio_segments should have provider column');
SELECT has_column('public', 'analysis_audio_segments', 'version', 'analysis_audio_segments should have version column');
SELECT has_column('public', 'analysis_audio_segments', 'segment_index', 'analysis_audio_segments should have segment_index column');
SELECT has_column('public', 'analysis_audio_segments', 'created_at', 'analysis_audio_segments should have created_at column');
SELECT has_column('public', 'analysis_audio_segments', 'prompt', 'analysis_audio_segments should have prompt column');

-- Verify dropped columns
SELECT hasnt_column('public', 'analysis_audio_segments', 'analysis_feedback_id', 'analysis_audio_segments should not have old analysis_feedback_id column');
SELECT hasnt_column('public', 'analysis_audio_segments', 'audio_duration_ms', 'analysis_audio_segments should not have audio_duration_ms column');
SELECT hasnt_column('public', 'analysis_audio_segments', 'audio_format', 'analysis_audio_segments should not have audio_format column');
SELECT hasnt_column('public', 'analysis_audio_segments', 'analysis_id', 'analysis_audio_segments should not have analysis_id column');

-- Test 7: Test SSML job trigger on feedback insert
-- First create required analysis_jobs and analyses records
-- Use a test UUID since auth.uid() returns null in test context
INSERT INTO video_recordings (user_id, storage_path, filename, file_size, duration_seconds, format, upload_status)
VALUES ('550e8400-e29b-41d4-a716-446655440000'::uuid, 'test/video.mp4', 'test.mp4', 1000000, 30, 'mp4', 'completed');

SELECT currval('video_recordings_id_seq') AS video_id \gset

INSERT INTO analysis_jobs (user_id, video_recording_id, status)
VALUES ('550e8400-e29b-41d4-a716-446655440000'::uuid, :video_id, 'completed');

SELECT currval('analysis_jobs_id_seq') AS job_id \gset

-- Insert analysis and get the ID
DO $$
DECLARE
    analysis_uuid uuid;
    feedback_id_var bigint;
BEGIN
    INSERT INTO analyses (job_id, full_feedback_text, summary_text)
    VALUES ((SELECT currval('analysis_jobs_id_seq')), 'Test feedback', 'Test summary')
    RETURNING id INTO analysis_uuid;
    
    -- Now insert feedback
    INSERT INTO analysis_feedback (analysis_id, timestamp_seconds, category, message, confidence, impact)
    VALUES (analysis_uuid, 10.5, 'posture', 'Test feedback message', 0.9, 0.8)
    RETURNING id INTO feedback_id_var;
    
    -- Store feedback_id for later use
    PERFORM set_config('test.feedback_id', feedback_id_var::text, false);
END $$;

-- Get the stored feedback_id
SELECT current_setting('test.feedback_id')::bigint AS feedback_id \gset

-- Verify feedback status was set to queued
SELECT is(
  (SELECT ssml_status FROM analysis_feedback WHERE id = :feedback_id),
  'queued',
  'Feedback ssml_status should be set to queued'
);

SELECT is(
  (SELECT audio_status FROM analysis_feedback WHERE id = :feedback_id),
  'queued',
  'Feedback audio_status should be set to queued'
);

-- Verify attempts are initialized to 0
SELECT is(
  (SELECT ssml_attempts FROM analysis_feedback WHERE id = :feedback_id),
  0,
  'Feedback ssml_attempts should be initialized to 0'
);

SELECT is(
  (SELECT audio_attempts FROM analysis_feedback WHERE id = :feedback_id),
  0,
  'Feedback audio_attempts should be initialized to 0'
);

-- Test 8: Test that empty message still gets default status (current behavior)
-- Insert empty feedback and store its ID
DO $$
DECLARE
    analysis_uuid uuid;
    empty_feedback_id_var bigint;
BEGIN
    SELECT id INTO analysis_uuid FROM analyses ORDER BY created_at DESC LIMIT 1;

    INSERT INTO analysis_feedback (analysis_id, timestamp_seconds, category, message, confidence, impact)
    VALUES (analysis_uuid, 15.0, 'posture', '', 0.8, 0.7)
    RETURNING id INTO empty_feedback_id_var;

    PERFORM set_config('test.empty_feedback_id', empty_feedback_id_var::text, false);
END $$;

SELECT current_setting('test.empty_feedback_id')::bigint AS empty_feedback_id \gset

SELECT is(
  (SELECT ssml_status FROM analysis_feedback WHERE id = :empty_feedback_id),
  'queued',
  'Empty message feedback should still have ssml_status set to queued (default behavior)'
);

SELECT is(
  (SELECT audio_status FROM analysis_feedback WHERE id = :empty_feedback_id),
  'queued',
  'Empty message feedback should still have audio_status set to queued (default behavior)'
);

-- Test 9: Test foreign key constraints
SELECT throws_ok(
  'INSERT INTO analysis_ssml_segments (feedback_id, segment_index, ssml) VALUES (99999, 0, ''test'')',
  '23503',
  NULL,
  'Should enforce foreign key constraint on feedback_id'
);

SELECT * FROM finish();

ROLLBACK;
