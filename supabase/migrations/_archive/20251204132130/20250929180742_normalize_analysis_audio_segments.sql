-- Migration: Normalize analysis_audio_segments schema
-- Purpose: Rename analysis_feedback_id -> feedback_id, drop redundant fields, rename audio_prompt -> prompt

-- Step 1: Drop old RLS policies that reference analysis_id
DROP POLICY IF EXISTS "Users can insert audio segments for their own analyses" ON "public"."analysis_audio_segments";
DROP POLICY IF EXISTS "Users can update audio segments for their own analyses" ON "public"."analysis_audio_segments";
DROP POLICY IF EXISTS "Users can view audio segments for their own analyses" ON "public"."analysis_audio_segments";

-- Step 2: Rename columns and drop unnecessary ones
-- Use IF EXISTS pattern since the baseline schema may already have these changes
DO $$
BEGIN
  -- Rename analysis_feedback_id to feedback_id if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'analysis_audio_segments' 
    AND column_name = 'analysis_feedback_id'
  ) THEN
    ALTER TABLE public.analysis_audio_segments 
      RENAME COLUMN analysis_feedback_id TO feedback_id;
  END IF;

  -- Rename audio_prompt to prompt if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'analysis_audio_segments' 
    AND column_name = 'audio_prompt'
  ) THEN
    ALTER TABLE public.analysis_audio_segments 
      RENAME COLUMN audio_prompt TO prompt;
  END IF;
END $$;

-- Drop columns if they exist
ALTER TABLE public.analysis_audio_segments 
  DROP COLUMN IF EXISTS audio_duration_ms;

ALTER TABLE public.analysis_audio_segments 
  DROP COLUMN IF EXISTS audio_format;

ALTER TABLE public.analysis_audio_segments 
  DROP COLUMN IF EXISTS analysis_id;

-- Step 3: Create new RLS policies using the updated schema
-- These policies now check via feedback_id -> analysis_feedback -> analysis -> analysis_jobs -> user
CREATE POLICY "Users can insert audio segments for their own analyses" ON "public"."analysis_audio_segments" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."analysis_feedback" "af"
     JOIN "public"."analyses" "a" ON (("a"."id" = "af"."analysis_id"))
     JOIN "public"."analysis_jobs" "aj" ON (("aj"."id" = "a"."job_id")))
  WHERE (("af"."id" = "analysis_audio_segments"."feedback_id") AND ("aj"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));

CREATE POLICY "Users can update audio segments for their own analyses" ON "public"."analysis_audio_segments" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."analysis_feedback" "af"
     JOIN "public"."analyses" "a" ON (("a"."id" = "af"."analysis_id"))
     JOIN "public"."analysis_jobs" "aj" ON (("aj"."id" = "a"."job_id")))
  WHERE (("af"."id" = "analysis_audio_segments"."feedback_id") AND ("aj"."user_id" = ( SELECT "auth"."uid"() AS "uid")))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."analysis_feedback" "af"
     JOIN "public"."analyses" "a" ON (("a"."id" = "af"."analysis_id"))
     JOIN "public"."analysis_jobs" "aj" ON (("aj"."id" = "a"."job_id")))
  WHERE (("af"."id" = "analysis_audio_segments"."feedback_id") AND ("aj"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));

CREATE POLICY "Users can view audio segments for their own analyses" ON "public"."analysis_audio_segments" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."analysis_feedback" "af"
     JOIN "public"."analyses" "a" ON (("a"."id" = "af"."analysis_id"))
     JOIN "public"."analysis_jobs" "aj" ON (("aj"."id" = "a"."job_id")))
  WHERE (("af"."id" = "analysis_audio_segments"."feedback_id") AND ("aj"."user_id" = ( SELECT "auth"."uid"() AS "uid"))))));

-- Step 4: Update table comments
COMMENT ON COLUMN public.analysis_audio_segments.feedback_id IS 'Foreign key to analysis_feedback.id';
COMMENT ON COLUMN public.analysis_audio_segments.prompt IS 'Prompt used to generate the audio for this segment';
COMMENT ON COLUMN public.analysis_audio_segments.duration_ms IS 'Duration in milliseconds (numeric to support decimals)';
COMMENT ON COLUMN public.analysis_audio_segments.format IS 'Audio format (aac, mp3, wav)';
