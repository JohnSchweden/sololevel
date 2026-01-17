# Supabase Backend

## Commands
- Always use `yarn supabase <command>` (never direct `supabase`)
- Start: `yarn supabase start`
- Functions: `yarn supabase functions serve`
- DB logs: `yarn supabase db logs`

## Guidelines
- Enable RLS on all tables
- Use Edge Functions for privileged logic
- Never expose secrets in client code
- Store secrets in environment variables only

## SQL Conventions
- Tables: plural snake_case (e.g., `users`, `posts`)
- Columns: singular snake_case (e.g., `user_id`, `created_at`)
- Always include: `id bigint generated always as identity primary key`
- Always qualify with schema: `public.users`

## Environment Variables
Pre-populated in Edge Functions:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_DB_URL`

## Testing
- Shared utilities: `yarn workspace @my/supabase-functions test` (Vitest)
- Edge Functions: `yarn workspace @my/supabase-functions test:deno` (Deno)
- Use Deno's native test framework
- Database/RLS: `yarn test:db` (pgTAP)
