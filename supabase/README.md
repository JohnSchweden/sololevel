# Supabase Backend

This directory contains the complete Supabase backend setup for SoloLevel - AI Coach App, including database, edge functions, and shared utilities.

## 📁 Directory Structure

```
supabase/
├── config.toml              # Supabase project configuration
├── seed.sql                 # Database seed data
├── migrations/              # Database schema migrations
├── shared/                  # Cross-platform shared utilities
│   ├── gemini/             # Google AI Gemini integration
│   ├── http/               # HTTP utilities (CORS, responses)
│   ├── logger.ts           # Centralized logging
│   ├── storage/            # Storage utilities
│   └── supabase/           # Supabase client utilities
├── functions/              # Edge Functions
│   ├── _shared/            # Domain-specific shared code
│   │   ├── db/            # Database operations
│   │   ├── notifications.ts # Real-time notifications
│   │   ├── pipeline/      # AI analysis pipeline
│   │   ├── pose/          # Pose detection utilities
│   │   └── types/         # TypeScript interfaces
│   ├── ai-analyze-video/   # Main AI video analysis function
│   │   └── routes/        # Route handlers
│   ├── package.json        # Node.js dependencies (for testing)
│   ├── deno.json          # Deno configuration
│   └── vitest.config.mjs   # Vitest configuration
└── tests/                  # Database tests
    └── database/           # SQL-based database tests
```

## 🏗️ Architecture Overview

### Shared Utilities (`shared/`)
Cross-cutting utilities that can be used by any service in the monorepo:
- **Gemini**: AI model integration for video analysis
- **HTTP**: CORS headers and response utilities
- **Logger**: Centralized logging with structured output
- **Storage**: File download and upload utilities
- **Supabase**: Client initialization and utilities

### Domain-Specific Code (`functions/_shared/`)
Business logic specific to video analysis:
- **DB**: Database operations for analysis jobs
- **Pipeline**: Orchestration of AI analysis workflow
- **Pose**: Computer vision utilities for pose detection
- **Types**: TypeScript interfaces for video processing

### Edge Functions (`functions/`)
Serverless functions running on Supabase Edge Runtime:
- **ai-analyze-video**: Main video analysis endpoint with routing

## 🧪 Testing Strategy

### Test Runners by Location
- **`supabase/shared/`**: Vitest (Node.js testing)
- **`supabase/functions/_shared/`**: Vitest (Node.js testing)
- **`supabase/functions/`**: Deno test runner (Edge runtime)

### Running Tests
```bash
# All tests (Vitest + Deno)
yarn workspace @my/supabase-functions test:all

# Only Vitest tests (shared utilities)
yarn workspace @my/supabase-functions test

# Only Deno tests (edge functions)
yarn workspace @my/supabase-functions test:deno
```

## 🚀 Development Workflow

### Local Development
```bash
# Start Supabase locally
supabase start

# Deploy functions
supabase functions deploy ai-analyze-video

# Test functions locally
supabase functions serve ai-analyze-video
```

### Database Management
```bash
# Apply migrations
supabase db push

# Reset database (⚠️ destructive)
supabase db reset

# Generate new migration
supabase db diff -f new_migration_name
```

## 📋 Code Organization Principles

### Import Boundaries
- ✅ Functions can import from `shared/`
- ✅ Functions can import from `_shared/`
- ❌ Shared utilities cannot import from functions
- ❌ Shared utilities cannot import from `_shared/`

### Deployment Considerations
- Edge functions only deploy source code (no `node_modules`)
- Test files are excluded from deployment
- Only runtime dependencies are included in bundles

## 🔧 Configuration Files

- **`config.toml`**: Project configuration (auth, database, etc.)
- **`deno.json`**: Deno runtime configuration for edge functions
- **`vitest.config.mjs`**: Testing configuration for shared utilities
- **`package.json`**: Node.js dependencies for development/testing

## 📊 Database

### Migrations
Database schema changes are managed through migrations in the `migrations/` directory. Each migration includes:
- Forward migration (up)
- Rollback migration (down)
- Proper naming convention with timestamps

### Testing
Database tests are written in SQL and run against test databases to ensure:
- Schema integrity
- RLS policy enforcement
- Data consistency
- Performance optimizations

## 🔒 Security

- Row Level Security (RLS) policies enforced on all tables
- JWT authentication via Supabase Auth
- Environment variable management for secrets
- CORS configuration for cross-origin requests

## 📈 Performance

- Edge functions for low-latency processing
- Database indexes optimized for common queries
- Efficient AI pipeline with progress tracking
- Connection pooling and caching where appropriate

---

**Note**: This backend serves the AI-powered video coaching features of SoloLevel, providing real-time feedback and analysis for fitness and movement training.
