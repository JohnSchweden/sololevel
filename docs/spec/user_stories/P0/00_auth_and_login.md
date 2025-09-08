# User Stories — Auth & Login (P0)

References: `../PRD.md`, `../TRD.md`, `../wireflow.png`

## US-AL-01: Sign up / Sign in
- As a user, I want to authenticate quickly.
- Priority: P0
- Acceptance Criteria:
  - Given email or provider auth
  - When I complete the flow
  - Then I am signed in and redirected to the Home/Record screen

## US-AL-02: Secure access to my data
- As a user, only I should access my analyses.
- Priority: P0
- Acceptance Criteria:
  - Given RLS policies
  - When fetching analyses
  - Then only rows with `user_id = auth.uid()` are visible
