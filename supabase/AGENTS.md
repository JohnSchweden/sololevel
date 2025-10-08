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
