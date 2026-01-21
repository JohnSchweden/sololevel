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

### Triggers & webhooks (footguns)
- **Dashboard webhooks**: `supabase_functions.http_request(...)` ignores `WHEN (...)` clauses on triggers, so it can fire on every update and create infinite loops if the webhook handler updates the same row. Prefer a custom `plpgsql` trigger function with guards in the function body (e.g. status transition checks) and call `net.http_post(...)` from there.

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
