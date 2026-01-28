# Supabase Backend

## Commands
- Always use `yarn supabase <command>` for all Supabase CLI operations
- Start local stack: `yarn supabase start`
- Serve Edge Functions: `yarn supabase functions serve`
- View DB logs: `yarn supabase db logs`

## Guidelines
- Always enable RLS on all tables
- Always use Edge Functions for privileged logic that requires elevated permissions
- Always keep secrets in environment variables and Edge Functions; never include them in client code
- Always store secrets in environment variables only

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
