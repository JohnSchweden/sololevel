-- Add title column to analyses table
-- This migration adds a nullable title field to store the analysis title
-- extracted from the AI prompt response

alter table public.analyses
  add column if not exists title text;

comment on column public.analyses.title is 'Concise roast title for the analysis (max 60 characters) extracted from AI prompt';

