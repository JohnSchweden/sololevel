-- Migration: Fix SSML sequence permissions for service_role
-- Purpose: Ensure service_role can use the analysis_ssml_segments_id_seq

-- Grant USAGE and ALL on the sequence to service_role
GRANT ALL ON SEQUENCE public.analysis_ssml_segments_id_seq TO service_role;
GRANT USAGE ON SEQUENCE public.analysis_ssml_segments_id_seq TO service_role;

-- Also ensure table permissions are correct
GRANT ALL ON TABLE public.analysis_ssml_segments TO service_role;
