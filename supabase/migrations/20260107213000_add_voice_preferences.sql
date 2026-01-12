-- Add voice preferences to profiles table
-- Extends profiles with coach_gender and coach_mode for user preferences

-- Add voice preference columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN coach_gender TEXT DEFAULT 'female' 
    CHECK (coach_gender IN ('male', 'female')),
  ADD COLUMN coach_mode TEXT DEFAULT 'roast' 
    CHECK (coach_mode IN ('roast', 'zen', 'lovebomb'));

COMMENT ON COLUMN public.profiles.coach_gender IS 'User preferred coach gender (male/female)';
COMMENT ON COLUMN public.profiles.coach_mode IS 'User preferred coaching style (roast/zen/lovebomb)';

-- Add voice configuration snapshot columns to analysis_jobs
-- These store the resolved config at analysis time for historical accuracy
ALTER TABLE public.analysis_jobs
  ADD COLUMN coach_gender TEXT,
  ADD COLUMN coach_mode TEXT,
  ADD COLUMN voice_name_used TEXT,
  ADD COLUMN avatar_asset_key_used TEXT;

COMMENT ON COLUMN public.analysis_jobs.coach_gender IS 'Snapshot: Coach gender used for this analysis';
COMMENT ON COLUMN public.analysis_jobs.coach_mode IS 'Snapshot: Coach mode used for this analysis';
COMMENT ON COLUMN public.analysis_jobs.voice_name_used IS 'Snapshot: TTS voice name used (e.g., Aoede, Gacrux)';
COMMENT ON COLUMN public.analysis_jobs.avatar_asset_key_used IS 'Snapshot: Avatar asset key displayed (e.g., female_roast)';

-- Note: RLS policies on profiles already cover the new columns
-- Existing "Users can update their own profile" policy allows updates to coach_gender and coach_mode

