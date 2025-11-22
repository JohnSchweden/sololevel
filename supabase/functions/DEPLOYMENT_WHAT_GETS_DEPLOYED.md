# What Gets Deployed with `yarn supabase functions deploy`

## Quick Answer

**Yes, all your runtime code files will be deployed**, but only the files that are actually imported/used by your functions.

## How Supabase CLI Bundles Functions

When you run `yarn supabase functions deploy`, the CLI:

1. **Deploys each function directory separately** as an independent Edge Function
2. **Uses Deno's bundler** to follow all import statements
3. **Includes all imported code** (directly or transitively)
4. **Excludes test files** and non-runtime artifacts

## What Gets Deployed ✅

### Function Entry Points
- `ai-analyze-video/index.ts` → Deployed as `ai-analyze-video` function
- `storage-upload-finalize/index.ts` → Deployed as `storage-upload-finalize` function
- `admin-auth/index.ts` → Deployed as `admin-auth` function

### All Imported Code
Since your functions import from `_shared/`, **all imported `_shared/` code gets bundled**:

```typescript
// From ai-analyze-video/index.ts
import { corsHeaders } from '../_shared/http/cors.ts'           // ✅ Deployed
import { createErrorResponse } from '../_shared/http/responses.ts' // ✅ Deployed
import { createLogger } from '../_shared/logger.ts'             // ✅ Deployed
import { createServiceClientFromEnv } from '../_shared/supabase/client.ts' // ✅ Deployed
```

**All files imported (directly or transitively) are included:**
- ✅ `_shared/http/cors.ts`
- ✅ `_shared/http/responses.ts`
- ✅ `_shared/logger.ts`
- ✅ `_shared/supabase/client.ts`
- ✅ `_shared/db/analysis.ts` (if imported)
- ✅ `_shared/gemini/*` (all imported Gemini modules)
- ✅ `_shared/pipeline/*` (all imported pipeline code)
- ✅ `_shared/storage/*` (all imported storage utilities)
- ✅ `_shared/services/*` (all imported services)
- ✅ `routes/*.ts` (all route handlers)
- ✅ `workers/*.ts` (all worker files)
- ✅ Any other `.ts` files that are imported

### Dependencies from deno.json
- ✅ External dependencies specified in `deno.json` imports:
  - `@supabase/supabase-js` (from JSR)
  - `@supabase/functions-js` (from npm)
  - `std/assert` (from Deno stdlib)

## What Does NOT Get Deployed ❌

### Test Files
- ❌ `*.test.ts` files (unless explicitly imported in runtime code)
- ❌ `test-setup.ts`
- ❌ `vitest.config.mjs`

### Build Artifacts
- ❌ `node_modules/` directory
- ❌ `coverage/` directory
- ❌ `.turbo/` directory
- ❌ `deno.lock` (not needed at runtime)

### Development Files
- ❌ `package.json` (Node.js dependencies, not used by Deno runtime)
- ❌ `tsconfig.json` (TypeScript config, not needed at runtime)
- ❌ `vitest.config.mjs` (test config)
- ❌ Backup files like `index.backup.ts`

### Unused Code
- ❌ Files in `_shared/` that are never imported
- ❌ Files in function directories that are never imported

## Example: What Gets Bundled for `ai-analyze-video`

When you deploy `ai-analyze-video`, the bundle includes:

```
ai-analyze-video/
├── index.ts ✅ (entry point)
├── gemini-llm-analysis.ts ✅ (imported)
├── gemini-ssml-feedback.ts ✅ (imported)
├── gemini-tts-audio.ts ✅ (imported)
├── routes/
│   ├── handleStartAnalysis.ts ✅ (imported)
│   ├── handleStatus.ts ✅ (imported)
│   ├── handleTTS.ts ✅ (imported)
│   ├── handleTestEnv.ts ✅ (imported)
│   ├── handleWebhookStart.ts ✅ (imported)
│   └── *.test.ts ❌ (not imported)
└── workers/
    ├── audioWorker.ts ✅ (imported)
    ├── ssmlWorker.ts ✅ (imported)
    └── workers.shared.ts ✅ (imported)

_shared/
├── http/
│   ├── cors.ts ✅ (imported)
│   └── responses.ts ✅ (imported)
├── logger.ts ✅ (imported)
├── supabase/
│   └── client.ts ✅ (imported)
├── db/
│   └── analysis.ts ✅ (imported)
├── gemini/
│   ├── config.ts ✅ (imported)
│   ├── filesClient.ts ✅ (imported)
│   ├── generate.ts ✅ (imported)
│   ├── parse.ts ✅ (imported)
│   ├── ssml.ts ✅ (imported)
│   ├── tts.ts ✅ (imported)
│   ├── types.ts ✅ (imported)
│   └── *.test.ts ❌ (not imported)
├── pipeline/
│   └── aiPipeline.ts ✅ (imported)
├── storage/
│   ├── download.ts ✅ (imported)
│   └── upload.ts ✅ (imported)
├── services/
│   └── speech/
│       ├── SSMLService.ts ✅ (imported)
│       └── TTSService.ts ✅ (imported)
└── media/
    └── audio.ts ✅ (imported)
```

## Verification

### Check What's Being Bundled

You can verify what gets deployed by checking the deployment logs:

```bash
yarn supabase functions deploy ai-analyze-video --debug
```

The debug output will show which files are being bundled.

### Test Locally First

Before deploying, test locally to ensure all imports resolve:

```bash
# Test that all imports work
yarn workspace @my/supabase-functions test:deno

# Serve locally to verify
yarn supabase functions serve ai-analyze-video
```

## Important Notes

1. **Dynamic Imports**: Code imported via `await import()` is also included if the import path is statically analyzable
2. **Shared Code**: The `_shared/` directory is bundled into each function that imports it. Each function gets its own copy.
3. **No Tree Shaking**: Deno bundles all imported code, even if parts are unused
4. **Import Paths**: Use relative paths (`../_shared/`) or absolute paths that Deno can resolve

## Summary

✅ **All your runtime code files WILL be deployed** - as long as they're imported  
✅ **All `_shared/` code WILL be deployed** - if it's imported by any function  
❌ **Test files will NOT be deployed** - unless you import them (don't do this)  
❌ **Build artifacts will NOT be deployed** - they're not needed at runtime

Your code structure with `_shared/` is perfect for Edge Functions deployment. The CLI will automatically bundle everything your functions need.

