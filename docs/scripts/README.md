# Scripts Documentation

## Overview

This directory contains utility scripts for development, testing, and database management. All scripts now use centralized environment configuration and shared utilities.

## Environment Setup

Scripts require the following environment variables in your `.env` file:

```bash
# Supabase Configuration
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Test Authentication
TEST_AUTH_EMAIL=testuser@example.com
TEST_AUTH_PASSWORD=testpass123

# Optional Database Configuration (defaults to local)
SUPABASE_DB_HOST=127.0.0.1
SUPABASE_DB_PORT=54322
SUPABASE_DB_USER=postgres
SUPABASE_DB_PASSWORD=postgres
SUPABASE_DB_NAME=postgres
```

## Core Scripts

### Authentication & User Management

- **`seedTestUser.mjs`** - Create or verify test user for development
  ```bash
  node scripts/seedTestUser.mjs
  ```

- **`smoke-login.mjs`** - Test user authentication and database access
  ```bash
  node scripts/smoke-login.mjs
  ```

- **`smoke-user-check.mjs`** - Verify test user exists in database
  ```bash
  node scripts/smoke-user-check.mjs
  ```

### Shared Utilities

- **`utils/env.mjs`** - Centralized environment configuration and helpers
  - `getScriptConfig()` - Load and validate environment variables
  - `createAdminClient()` - Create Supabase admin client
  - `createAnonClient()` - Create Supabase client for authentication
  - `createDbClient()` - Create direct PostgreSQL client
  - `createScriptLogger(name)` - Create logger for scripts
  - `scriptHelpers` - Common authentication and user management functions

- **`smoke/smoke-utils.mjs`** - Lightweight utilities for smoke tests using centralized env.mjs config
  - `createSmokeServiceClient()` - Supabase client with service role (async)
  - `createSmokeAnonClient()` - Supabase client with anon key (async)
  - `getSupabaseUrl()` - Get Supabase URL from centralized config
  - `SMOKE_TEST_USER` - Test user credentials from env.mjs config

### Smoke Test Scripts

Located in `scripts/smoke/` directory:

- **`smoke-analysis.mjs`** - Tests Edge Function invocation
- **`smoke-audio.mjs`** - Tests audio URL validation
- **`smoke-pipeline.mjs`** - Orchestrates full pipeline testing
- **`smoke-status.mjs`** - Tests analysis status polling
- **`smoke-upload.mjs`** - Tests video upload to storage
- **`smoke-uploadvideo.mjs`** - Tests uploadVideo service integration

## Usage Patterns

### Basic Script Structure

```javascript
import { createScriptLogger, getScriptConfig, createAdminClient } from './utils/env.mjs'

const logger = createScriptLogger('my-script')

async function main() {
  try {
    const config = getScriptConfig()
    const supabase = await createAdminClient(config)

    logger.info('Script starting...')
    // Your script logic here
    logger.success('Script completed!')

  } catch (error) {
    logger.error('Script failed:', error.message)
    process.exit(1)
  }
}

main()
```

### Smoke Test Structure

```javascript
import { loadSmokeEnv, createSmokeServiceClient } from './smoke/smoke-utils.mjs'
import { log } from '@my/logging'

// Load environment variables
loadSmokeEnv()

// Create Supabase client
const supabase = createSmokeServiceClient()

async function runSmokeTest() {
  log.info('🧪 Smoke Test: [Test Name]\n')

  try {
    // Test logic here

    log.info('\n🎯 Test Results:')
    log.info('✅ PASSED: [description of what passed]')

  } catch (error) {
    log.error('\n❌ Test failed:', error.message)
    process.exit(1)
  }

  log.info('\n🎉 Smoke test completed successfully!')
}

runSmokeTest()
```

### Authentication Testing

```javascript
import { scriptHelpers, createAnonClient, getScriptConfig } from './utils/env.mjs'

const config = getScriptConfig()
const supabase = await createAnonClient(config)

// Test login with env credentials
const { data, error } = await scriptHelpers.signInTestUser(supabase, config)
```

### User Management

```javascript
import { scriptHelpers, createAdminClient, getScriptConfig } from './utils/env.mjs'

const config = getScriptConfig()
const adminClient = await createAdminClient(config)

// Create or verify test user
const result = await scriptHelpers.ensureTestUser(adminClient, config)
```

## Migration from Legacy Scripts

The following legacy scripts have been replaced:

- `test-login.mjs` → `smoke-login.mjs`
- `check-user.mjs` → `smoke-user-check.mjs`
- `create_test_user.mjs`, `create-test-user.mjs`, etc. → `seedTestUser.mjs`
- All hard-coded credentials → Environment-driven configuration

## Troubleshooting

### Common Issues

1. **Missing environment variables**
   ```
   Error: Missing required environment variables: TEST_AUTH_EMAIL, TEST_AUTH_PASSWORD
   ```
   Solution: Ensure all required variables are set in your `.env` file

2. **Login failures**
   ```
   Login failed: Invalid login credentials
   ```
   Solution: Verify `TEST_AUTH_EMAIL` and `TEST_AUTH_PASSWORD` match an existing user in the database

3. **Database connection errors**
   ```
   Database error: connection refused
   ```
   Solution: Ensure Supabase local instance is running (`yarn supabase start`)

### Debug Mode

Enable debug logging by setting the `DEBUG` environment variable:

```bash
DEBUG=1 node scripts/seedTestUser.mjs
```

### Manual User Creation

If the admin API fails, you can create users directly in the database:

```javascript
import { createDbClient, getScriptConfig } from './utils/env.mjs'
import bcrypt from 'bcryptjs'

const config = getScriptConfig()
const client = await createDbClient(config)
await client.connect()

const hashedPassword = await bcrypt.hash(config.testAuth.password, 10)
await client.query(`
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, aud, role)
  VALUES (gen_random_uuid(), $1, $2, now(), now(), now(), 'authenticated', 'authenticated')
`, [config.testAuth.email, hashedPassword])
```

## Best Practices

1. **Always use shared utilities** - Import from `utils/env.mjs` instead of duplicating configuration
2. **Use structured logging** - Use `createScriptLogger()` instead of `log.info`
3. **Handle errors gracefully** - Always catch exceptions and exit with proper codes
4. **Validate environment** - Let `getScriptConfig()` validate required variables
5. **Clean up resources** - Close database connections and sign out of auth sessions

## Contributing

When adding new scripts:

1. Import shared utilities from `utils/env.mjs`
2. Use structured logging with `createScriptLogger()`
3. Follow the established error handling patterns
4. Add documentation to this README
5. Test with both local and production-like environments
