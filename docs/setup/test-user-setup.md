# Test User Setup Guide

This guide explains how to set up test users for development and E2E testing in the Solo:Level application.

## Overview

The test user seeding system provides a reliable way to create and manage test users for:
- Local development with test auth bootstrap
- E2E testing with Playwright
- Integration testing
- Manual testing scenarios

## Quick Start

### 1. Environment Setup

Add the following variables to your `.env.local` file:

```bash
# Test Authentication Configuration
TEST_AUTH_ENABLED=true
TEST_AUTH_EMAIL=test@example.com
TEST_AUTH_PASSWORD=test-password-123

# Supabase Configuration (for local development)
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
EXPO_PUBLIC_SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
```

### 2. Start Supabase

```bash
yarn supabase start
```

### 3. Seed Test User

```bash
yarn seed:test-user
```

## Usage Scenarios

### Local Development

When `TEST_AUTH_ENABLED=true`, the application will automatically sign in the test user on startup, eliminating the need for manual authentication during development.

### E2E Testing

Playwright tests use the seeded test user for pre-authentication:

```bash
# Run E2E tests with pre-authenticated sessions
yarn playwright test
```

### Manual Testing

You can manually sign in using the test credentials:
- Email: `test@example.com`
- Password: `test-password-123`

## Script Details

### Seeding Script (`scripts/seedTestUser.mjs`)

The seeding script:
1. **Checks for existing user** - Avoids duplicate creation
2. **Creates user if needed** - Uses Supabase Admin API
3. **Auto-confirms email** - No manual email verification required
4. **Verifies sign-in** - Ensures credentials work correctly
5. **Handles errors gracefully** - Provides clear error messages

### Key Features

- **Idempotent**: Safe to run multiple times
- **Environment validation**: Checks required variables
- **Auto-confirmation**: Email is pre-confirmed for testing
- **Verification**: Tests sign-in after creation
- **Error handling**: Graceful failure with helpful messages

## Troubleshooting

### Common Issues

#### "Missing required environment variables"
**Solution**: Ensure all required environment variables are set in `.env.local`

#### "Email already registered"
**Solution**: This usually means the user already exists. The script will find and use the existing user.

#### "Invalid credentials" during verification
**Solution**: Check that `TEST_AUTH_PASSWORD` matches what was used during creation.

#### "Connection refused" errors
**Solution**: Ensure Supabase is running locally with `yarn supabase start`

### Manual Verification

You can manually verify the test user exists:

```bash
# Check Supabase dashboard
open http://localhost:54323

# Or use the Supabase CLI
yarn supabase auth list-users
```

### Reset Test User

If you need to reset the test user:

```bash
# Delete the user via Supabase dashboard or CLI
yarn supabase auth delete-user <user-id>

# Then re-seed
yarn seed:test-user
```

## Security Considerations

### Environment Separation

- **Development**: Use local Supabase instance with test credentials
- **Production**: Test auth is disabled via build-time guards
- **CI/CD**: Use dedicated test environment with isolated credentials

### Credential Management

- Test credentials are stored in environment variables
- Never commit test credentials to version control
- Use different credentials for different environments
- Rotate test credentials periodically

## Integration with Other Systems

### Test Auth Bootstrap

The seeded user works seamlessly with the test auth bootstrap system:
- App automatically signs in the test user when `TEST_AUTH_ENABLED=true`
- No manual sign-in required during development

### Playwright Pre-Authentication

Playwright global setup uses the seeded user:
- Creates authenticated session before tests run
- All E2E tests run with pre-authenticated context
- No manual sign-in steps in individual tests

### RLS Testing

The test user is subject to the same RLS policies as real users:
- Can only access their own data
- Provides realistic testing of security policies
- Validates proper data isolation

## Best Practices

### Development Workflow

1. **Start fresh**: `yarn supabase start`
2. **Seed user**: `yarn seed:test-user`
3. **Develop**: App auto-authenticates with test user
4. **Test**: Run E2E tests with pre-authenticated sessions

### CI/CD Integration

```yaml
# Example GitHub Actions workflow
- name: Setup Supabase
  run: yarn supabase start

- name: Seed test user
  run: yarn seed:test-user
  env:
    TEST_AUTH_ENABLED: true
    TEST_AUTH_EMAIL: ci-test@example.com
    TEST_AUTH_PASSWORD: ci-test-password-123

- name: Run E2E tests
  run: yarn playwright test
```

### Multiple Test Users

For advanced scenarios requiring multiple users:

```bash
# Create additional users with different credentials
TEST_AUTH_EMAIL=user2@example.com TEST_AUTH_PASSWORD=password2 yarn seed:test-user
TEST_AUTH_EMAIL=user3@example.com TEST_AUTH_PASSWORD=password3 yarn seed:test-user
```

## Related Documentation

- [Authentication Implementation Guide](../tasks/auth-implementation-action-plan.md)
- [Playwright Setup Guide](../testing/playwright-setup.md)
- [Environment Configuration](../setup/environment-setup.md)
- [Supabase Local Development](../setup/supabase-setup.md)

---

**Last Updated**: 2025-09-24  
**Maintained By**: Engineering Team
