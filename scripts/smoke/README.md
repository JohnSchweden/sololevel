# Smoke Tests

This folder contains smoke test scripts for validating the video processing pipeline.

## Scripts

### Orchestrator
- `smoke-pipeline.mjs` - Runs all smoke tests in sequence

### Individual Tests
- `smoke-uploadvideo.mjs` - Tests video upload service directly
- `smoke-upload.mjs` - Tests raw video upload to Supabase storage
- `smoke-analysis.mjs` - Tests AI analysis edge function invocation
- `smoke-status.mjs` - Tests status polling for analysis completion
- `smoke-audio.mjs` - Tests audio URL validation

### Auth Tests
- `smoke-login.mjs` - Tests user authentication
- `smoke-user-check.mjs` - Tests user data retrieval

## Usage

Run individual tests:
```bash
node scripts/smoke/smoke-analysis.mjs <video-path> [user-id]
```

Run full pipeline test:
```bash
node scripts/smoke/smoke-pipeline.mjs
```

## Pipeline Flow

The `smoke-pipeline.mjs` orchestrator runs tests in this order:
1. Video Upload → Storage
2. Analysis Invocation → Edge Function
3. Status Polling → Completion Check
4. Audio Validation → URL Accessibility
