-- Add ssml_system_instruction column to coach_voice_configs
-- Enables mode-specific SSML formatting (pauses, emphasis, prosody) without code deployments

ALTER TABLE public.coach_voice_configs
  ADD COLUMN ssml_system_instruction TEXT NOT NULL DEFAULT '';

-- Seed SSML instructions for all 6 gender/mode combinations
-- Roast mode: Comedic timing with sarcastic emphasis
UPDATE public.coach_voice_configs SET ssml_system_instruction = 
  'You are a sarcastic comedian with sharp wit. Format the text with comedic timing: use punchy <break> pauses before punchlines, strong <emphasis> on roast words, and varied <prosody> for sarcastic inflection.'
  WHERE mode = 'roast';

-- Zen mode: Calm pacing with gentle delivery
UPDATE public.coach_voice_configs SET ssml_system_instruction = 
  'You are a calm meditation guide. Format the text with measured pacing: use gentle <break> pauses between thoughts, soft <emphasis level=''reduced''>, and steady <prosody rate=''slow''> for peaceful delivery.'
  WHERE mode = 'zen';

-- Lovebomb mode: Enthusiastic emphasis with celebratory prosody
UPDATE public.coach_voice_configs SET ssml_system_instruction = 
  'You are an enthusiastic supportive parent. Format the text with warm emphasis: use celebratory <emphasis level=''strong''> on positive words, excited <prosody rate=''medium'' pitch=''+10%''>, and brief <break> pauses for impact.'
  WHERE mode = 'lovebomb';
