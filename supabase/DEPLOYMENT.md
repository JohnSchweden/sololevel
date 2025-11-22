# Supabase Edge Functions Deployment Guide

## Prerequisites

1. **Supabase CLI** installed (via `yarn supabase`)
2. **Access Token** from [Supabase Dashboard](https://supabase.com/dashboard/account/tokens)
3. **Project Reference ID** from your Supabase project settings

## Step 1: Link to Remote Project

Link your local project to the remote Supabase instance:

```bash
# Link using project reference
yarn supabase link --project-ref <your-project-ref>

# Or link interactively (will prompt for credentials)
yarn supabase link
```

**Get your project ref:**
- Go to [Supabase Dashboard](https://supabase.com/dashboard)
- Select your project
- Go to Settings → General
- Copy the "Reference ID"

## Step 2: Set Environment Variables/Secrets

Edge Functions need secrets for API keys and configuration. Set them via CLI:

```bash
# Set individual secrets
yarn supabase secrets set GEMINI_API_KEY=your_gemini_api_key
yarn supabase secrets set GEMINI_MMM_MODEL=gemini-2.0-flash
yarn supabase secrets set GEMINI_LLM_MODEL=gemini-2.5-flash-lite
yarn supabase secrets set GEMINI_TTS_MODEL=gemini-2.5-flash-preview-tts
yarn supabase secrets set GEMINI_FILES_MAX_MB=20
yarn supabase secrets set DEFAULT_VOICE_NAME=Sadachbia

# Optional: Set AI analysis mode (real or mock)
yarn supabase secrets set AI_ANALYSIS_MODE=real
yarn supabase secrets set AI_ANALYSIS_MOCK_SERVICES=false

# Optional: Pipeline stages configuration (JSON)
yarn supabase secrets set PIPELINE_STAGES='{"runVideoAnalysis": true, "runLLMFeedback": true, "runSSML": true, "runTTS": true}'

# Optional: TTS configuration
yarn supabase secrets set TTS_DEFAULT_FORMAT=wav
yarn supabase secrets set TTS_ALLOWED_FORMATS=wav,mp3
yarn supabase secrets set SUPABASE_SIGNED_URL_TTL_SECONDS=900
```

**Note:** The following are automatically available in Edge Functions:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_DB_URL`

## Step 3: Deploy Functions

Deploy individual functions or all functions:

```bash
# Deploy a specific function
yarn supabase functions deploy ai-analyze-video
yarn supabase functions deploy storage-upload-finalize
yarn supabase functions deploy admin-auth

# Deploy all functions at once
yarn supabase functions deploy
```

**Deploy with verification:**
```bash
# Deploy with JWT verification enabled (default)
yarn supabase functions deploy ai-analyze-video --verify-jwt

# Deploy without JWT verification (for webhooks/public endpoints)
yarn supabase functions deploy ai-analyze-video --no-verify-jwt
```

## Step 4: Verify Deployment

### Check Function Status

```bash
# List all deployed functions
yarn supabase functions list

# Get function details
yarn supabase functions list ai-analyze-video
```

### Test Deployed Function

```bash
# Test via curl (replace with your project URL)
curl -i --location --request POST \
  'https://<your-project-ref>.supabase.co/functions/v1/ai-analyze-video' \
  --header 'Authorization: Bearer <your-anon-key>' \
  --header 'Content-Type: application/json' \
  --data '{"test": true}'
```

### View Function Logs

```bash
# Stream logs from deployed function
yarn supabase functions logs ai-analyze-video

# View logs with filters
yarn supabase functions logs ai-analyze-video --follow
```

## Step 5: Update Function Configuration

Functions are configured in `supabase/config.toml`:

```toml
[functions.ai-analyze-video]
enabled = true
verify_jwt = false  # Set to true to require JWT auth
entrypoint = "./functions/ai-analyze-video/index.ts"
```

After changing config, redeploy:
```bash
yarn supabase functions deploy ai-analyze-video
```

## Environment-Specific Deployment

### Production Deployment

```bash
# Ensure you're linked to production project
yarn supabase link --project-ref <production-project-ref>

# Set production secrets
yarn supabase secrets set GEMINI_API_KEY=<production-key>

# Deploy
yarn supabase functions deploy
```

### Staging Deployment

```bash
# Link to staging project
yarn supabase link --project-ref <staging-project-ref>

# Set staging secrets
yarn supabase secrets set GEMINI_API_KEY=<staging-key>
yarn supabase secrets set AI_ANALYSIS_MODE=mock  # Use mocks in staging

# Deploy
yarn supabase functions deploy
```

## Troubleshooting

### Function Not Found After Deployment

1. Verify link: `yarn supabase projects list`
2. Check function name matches directory name
3. Ensure `index.ts` exists in function directory

### Secrets Not Available

1. Verify secrets are set: `yarn supabase secrets list`
2. Redeploy function after setting secrets
3. Check secret names match what code expects

### Import Errors

1. Ensure `deno.json` has correct import mappings
2. Check `_shared/` code is accessible (relative imports)
3. Verify Deno version compatibility

### Authentication Errors

1. Check JWT verification setting in `config.toml`
2. Verify `Authorization` header in requests
3. Use service role key for admin operations

## Quick Reference

```bash
# Link project
yarn supabase link --project-ref <ref>

# Set secrets
yarn supabase secrets set KEY=value

# Deploy function
yarn supabase functions deploy <function-name>

# View logs
yarn supabase functions logs <function-name>

# List functions
yarn supabase functions list

# List secrets (names only, not values)
yarn supabase secrets list
```

## CI/CD Integration

For automated deployments, use environment variables:

```bash
# In CI/CD pipeline
export SUPABASE_ACCESS_TOKEN=${{ secrets.SUPABASE_ACCESS_TOKEN }}
yarn supabase link --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
yarn supabase secrets set GEMINI_API_KEY=${{ secrets.GEMINI_API_KEY }}
yarn supabase functions deploy
```

## Function URLs

After deployment, functions are available at:
```
https://<project-ref>.supabase.co/functions/v1/<function-name>
```

Example:
```
https://qbkvqhoijishdkqlwhqp.supabase.co/functions/v1/ai-analyze-video
```

