# User Stories — Profile & Settings (P0)

References: `../PRD.md`, `../TRD.md`, `../wireflow.png`

## US-PS-01: Basic profile
- As a user, I can set a username and avatar.
- Priority: P0
- Acceptance Criteria:
  - Given I am authenticated
  - When I edit Profile
  - Then I can update username (unique) and avatar

## US-PS-02: Secure access to my data
- As a user, only I should access my analyses.
- Priority: P0
- Acceptance Criteria:
  - Given RLS policies
  - When fetching analyses
  - Then only rows with `user_id = auth.uid()` are visible
