-- Create coach_voice_configs table for voice-to-mode-gender mappings
-- Enables dynamic LLM prompt injection and TTS voice selection without code deployments

CREATE TABLE IF NOT EXISTS public.coach_voice_configs (
  id SERIAL PRIMARY KEY,
  gender TEXT NOT NULL CHECK (gender IN ('male', 'female')),
  mode TEXT NOT NULL CHECK (mode IN ('roast', 'zen', 'lovebomb')),
  
  -- TTS Configuration
  voice_name TEXT NOT NULL,              -- Gemini voice: 'Aoede', 'Gacrux', etc.
  tts_system_instruction TEXT NOT NULL,  -- Accent/tone: 'Use a funny north european accent.'
  
  -- LLM Prompt Injection (variable parts only)
  prompt_voice TEXT NOT NULL,            -- Voice directive for feedback generation
  prompt_personality TEXT NOT NULL,      -- Personality description for LLM
  
  -- Avatar
  avatar_asset_key TEXT NOT NULL,        -- Maps to bundled asset: 'female_roast'
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(gender, mode)
);

-- Create index for fast lookups
CREATE INDEX idx_voice_configs_lookup 
  ON public.coach_voice_configs(gender, mode, is_active);

-- Enable RLS
ALTER TABLE public.coach_voice_configs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: All authenticated users can read active configs
CREATE POLICY "Users can read voice configs"
  ON public.coach_voice_configs FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Seed data for all 6 gender/mode combinations
INSERT INTO public.coach_voice_configs (
  gender, mode, voice_name, tts_system_instruction,
  prompt_voice, prompt_personality, avatar_asset_key
) VALUES
  -- ROAST MODE
  ('female', 'roast', 'Aoede', 
   'Use a funny north european accent.',
   'Roast my performance!!! Use playful insults and biting humour (Brutal, memorable, transformative) with comedic timing targeting skills and execution only.',
   'Ruthless/Sharp Insight with sarcastic humour, a sharp wit, and a laid-back, confident US brooklyn accent',
   'female_roast'),
  
  ('male', 'roast', 'Sadachbia',
   'Use a roast me russian accent.',
   'Roast my performance!!! Use playful insults and biting humour (Brutal, memorable, transformative) with comedic timing targeting skills and execution only.',
   'Ruthless/Sharp Insight with sarcastic humour, a sharp wit, and a laid-back, confident US brooklyn accent',
   'male_roast'),
  
  -- ZEN MODE
  ('female', 'zen', 'Gacrux',
   'Use a balanced soft british accent.',
   'Zen me. Calm, mindful coaching. Guide with patience and understanding. Acknowledge effort before suggesting improvements.',
   'Peaceful/Supportive Guidence with gentle british composure',
   'female_zen'),
  
  ('male', 'zen', 'Algieba',
   'Use a balanced soft british accent.',
   'Zen me. Calm, mindful coaching. Guide with patience and understanding. Acknowledge effort before suggesting improvements.',
   'Peaceful/Supportive Guidence with gentle british composure',
   'male_zen'),
  
  -- LOVEBOMB MODE
  ('female', 'lovebomb', 'Gacrux',
   'Use a funny and lovable  american accent.',
   'Lovebomb my performance. Use warm and lovable positivity (memorable, transformative). Acknowledge effort before suggesting improvements.',
   'Admirable Parent Wisdom with warm and lovable positivity with musical lilt',
   'female_lovebomb'),
  
  ('male', 'lovebomb', 'Algieba',
   'Use a funny and lovable Irish accent.',
   'Lovebomb my performance. Use warm and lovable positivity (memorable, transformative). Acknowledge effort before suggesting improvements.',
   'Admirable Parent Wisdom with warm and lovable positivity with musical lilt',
   'male_lovebomb');

