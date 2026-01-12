-- Grant table-level permissions to service_role for coach_voice_configs
-- The RLS policy exists but service_role needs base table access first
GRANT SELECT ON public.coach_voice_configs TO service_role;
