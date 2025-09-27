-- Seed test user for development
-- NOTE: Use `yarn seed:test-user` script instead for env-driven user creation
-- This static seed is kept for database reset scenarios only
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, aud, role)
VALUES ('00000000-0000-0000-0000-000000000000', 'test@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', now(), now(), now(), 'authenticated', 'authenticated')
ON CONFLICT (id) DO NOTHING;

-- Seed test video recording for development
INSERT INTO public.video_recordings (user_id, filename, original_filename, file_size, duration_seconds, format, storage_path, upload_status, upload_progress, created_at, updated_at) 
VALUES ('00000000-0000-0000-0000-000000000000', 'sample.mp4', 'SampleVideo.mp4', 1048576, 30, 'mp4', 'raw/sample.mp4', 'completed', 100, now(), now());
