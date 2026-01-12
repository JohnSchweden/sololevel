-- Update handle_new_user to explicitly set voice preferences to NULL
-- This ensures new users see the first-login voice selection screen

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
begin
  insert into public.profiles (user_id, username, full_name, avatar_url, coach_gender, coach_mode)
  values (
    new.id,
    new.raw_user_meta_data->>'username',
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    NULL,  -- Explicitly NULL to trigger first-login voice selection screen
    NULL   -- Explicitly NULL - hasUserSetVoicePreferences() checks this
  );
  return new;
end;
$function$;
