# User Stories — Auth & Login (P0)

References: `../PRD.md`, `../TRD.md`, `../wireflow.png`

## Registration & Sign Up

### US-AL-01: Email/Password Registration
- As a new user, I want to create an account with email and password.
- Priority: P0
- Acceptance Criteria:
  - Given I provide a valid email and strong password
  - When I submit the registration form
  - Then my account is created and I receive a verification email
  - And I am redirected to email verification screen
  - And my password is securely hashed with bcrypt

### US-AL-02: Email Verification
- As a new user, I want to verify my email address to activate my account.
- Priority: P0
- Acceptance Criteria:
  - Given I receive a verification email
  - When I click the verification link
  - Then my email is verified and my account is activated
  - And I can proceed to sign in
  - And the verification link expires after 24 hours

### US-AL-03: Registration Validation
- As a user, I want clear feedback when registration fails.
- Priority: P0
- Acceptance Criteria:
  - Given I submit invalid registration data
  - When validation fails
  - Then I see specific error messages for each field
  - And I can correct the errors without losing other data
  - And duplicate email attempts show appropriate error

## Sign In & Authentication

### US-AL-04: Email/Password Sign In
- As a registered user, I want to sign in with my credentials.
- Priority: P0
- Acceptance Criteria:
  - Given I provide valid email and password
  - When I submit the sign-in form
  - Then I receive a JWT token
  - And I am redirected to the Home/Record screen
  - And my session persists across app restarts

### US-AL-05: Rate Limiting Protection
- As a system, I want to prevent brute force attacks on login.
- Priority: P0
- Acceptance Criteria:
  - Given multiple failed login attempts
  - When the rate limit is exceeded
  - Then further attempts are blocked for 15 minutes
  - And the user receives a clear rate limit message
  - And legitimate users can still access after the cooldown

### US-AL-06: Invalid Credentials Handling
- As a user, I want clear feedback when sign-in fails.
- Priority: P0
- Acceptance Criteria:
  - Given I provide invalid credentials
  - When sign-in fails
  - Then I see a generic "invalid credentials" message
  - And I can retry without revealing which field is wrong
  - And failed attempts are logged for security monitoring

## Password Management

### US-AL-07: Password Reset Request
- As a user, I want to reset my password when I forget it.
- Priority: P0
- Acceptance Criteria:
  - Given I forgot my password
  - When I request a password reset
  - Then I receive a secure reset link via email
  - And the link expires after 1 hour
  - And I can only use the link once

### US-AL-08: Password Reset Completion
- As a user, I want to set a new password via the reset link.
- Priority: P0
- Acceptance Criteria:
  - Given I have a valid password reset link
  - When I set a new password
  - Then my password is updated and securely hashed
  - And all existing sessions are invalidated
  - And I am automatically signed in with the new password

### US-AL-09: Password Strength Requirements
- As a system, I want to enforce strong passwords.
- Priority: P0
- Acceptance Criteria:
  - Given password requirements (8+ chars, mixed case, numbers, symbols)
  - When a user sets a weak password
  - Then they see real-time strength feedback
  - And weak passwords are rejected with specific guidance
  - And password strength is validated on both client and server

## Session Management

### US-AL-10: JWT Token Management
- As a system, I want to manage JWT tokens securely.
- Priority: P0
- Acceptance Criteria:
  - Given successful authentication
  - When JWT tokens are issued
  - Then they expire after 24 hours
  - And refresh tokens are provided for seamless renewal
  - And tokens are stored securely (httpOnly cookies for web, secure storage for native)

### US-AL-11: Session Persistence
- As a user, I want to stay signed in across app sessions.
- Priority: P0
- Acceptance Criteria:
  - Given I am signed in
  - When I close and reopen the app
  - Then I remain signed in
  - And my session persists until token expiration
  - And I can sign out manually when needed

### US-AL-12: Sign Out
- As a user, I want to sign out securely.
- Priority: P0
- Acceptance Criteria:
  - Given I am signed in
  - When I choose to sign out
  - Then my session is terminated
  - And all tokens are invalidated
  - And I am redirected to the sign-in screen

## User Profile Management

### US-AL-13: Profile Viewing
- As a user, I want to view my profile information.
- Priority: P0
- Acceptance Criteria:
  - Given I am signed in
  - When I access my profile
  - Then I can see my email and account creation date
  - And I can see my verification status
  - And I can access account management options

### US-AL-14: Email Update
- As a user, I want to update my email address.
- Priority: P1
- Acceptance Criteria:
  - Given I want to change my email
  - When I submit a new email address
  - Then I receive verification for the new email
  - And my account remains active with the old email until verification
  - And I must verify the new email to complete the change

### US-AL-15: Password Change
- As a user, I want to change my password while signed in.
- Priority: P1
- Acceptance Criteria:
  - Given I am signed in
  - When I change my password
  - Then I must provide my current password
  - And the new password meets strength requirements
  - And all other sessions are invalidated for security

## Security & Data Protection

### US-AL-16: Secure Data Access
- As a user, only I should access my analyses and data.
- Priority: P0
- Acceptance Criteria:
  - Given RLS policies are enforced
  - When fetching user data
  - Then only rows with `user_id = auth.uid()` are visible
  - And unauthorized access attempts are logged
  - And sensitive data is never exposed to other users

### US-AL-17: Account Security Monitoring
- As a system, I want to monitor for suspicious activity.
- Priority: P1
- Acceptance Criteria:
  - Given authentication events
  - When suspicious patterns are detected
  - Then security alerts are triggered
  - And additional verification may be required
  - And users are notified of security events

## Error Handling & UX

### US-AL-18: Network Error Handling
- As a user, I want graceful handling of network issues.
- Priority: P0
- Acceptance Criteria:
  - Given network connectivity issues
  - When authentication requests fail
  - Then I see appropriate error messages
  - And I can retry the operation
  - And my form data is preserved

### US-AL-19: Loading States
- As a user, I want clear feedback during authentication processes.
- Priority: P0
- Acceptance Criteria:
  - Given authentication operations
  - When processes are in progress
  - Then I see loading indicators
  - And buttons are disabled to prevent double-submission
  - And I understand what is happening

### US-AL-20: Accessibility
- As a user with disabilities, I want accessible authentication forms.
- Priority: P0
- Acceptance Criteria:
  - Given authentication forms
  - When using assistive technologies
  - Then all fields are properly labeled
  - And error messages are announced
  - And keyboard navigation works correctly