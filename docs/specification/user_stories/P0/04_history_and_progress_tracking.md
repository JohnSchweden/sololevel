# User Stories — History & Progress Tracking (P0)

References: `../PRD.md`, `../TRD.md`, `../wireflow.png`

## US-HI-01: View analysis history list
- As a user, I want to see my past analyses.
- Priority: P0
- Acceptance Criteria:
  - Given I am authenticated
  - When I open History
  - Then I see a list with date, title, and overall score

## US-HI-02: Open analysis detail
- As a user, I can view any previous feedback.
- Priority: P0
- Acceptance Criteria:
  - Given a history item
  - When I tap it
  - Then I see the full summary, audio, and metrics

## US-HI-03: Compare with previous session
- As a user, I want to see progress against last session.
- Priority: P0
- Acceptance Criteria:
  - Given at least two completed analyses
  - When I open the latest detail
  - Then I see delta indicators per metric vs. previous

## US-HI-04: Delete an analysis
- As a user, I can remove an analysis.
- Priority: P0
- Acceptance Criteria:
  - Given a history item
  - When I choose Delete and confirm
  - Then the row and associated artifacts become inaccessible
