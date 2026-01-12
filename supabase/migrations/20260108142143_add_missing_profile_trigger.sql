-- Add missing trigger to automatically create profile on user signup
-- This trigger was present in initial schema but missing from baseline

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();
