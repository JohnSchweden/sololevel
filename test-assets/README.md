# Test Assets

This folder contains test assets for development and testing.

## Videos

Place your test video files here for AI analysis testing:

- `test.mp4` - Your main test video (recommended: 5-15 seconds, under 10MB)
- Other `.mp4`, `.mov`, `.avi` files for different test scenarios

### Creating a Test Video

For best results, create a short test video showing:
- Someone performing a simple exercise (squat, push-up, etc.)
- Clear movement with good lighting
- Front-facing or side view
- Keep it under 30 seconds to avoid long processing times

**Quick test video creation:**
- Use your phone's camera to record a short clip
- Or use screen recording software to capture exercise demos
- Export as MP4 with H.264 codec for best compatibility

## Testing AI Function

### Prerequisites

1. **Set up environment:**
   Create a `.env` file in the project root:
   ```bash
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   GEMINI_API_KEY=your_gemini_api_key_here  # Optional
   ```

2. **Start local Supabase:**
   ```bash
   yarn supabase start
   ```

3. **Put your test video** in `test-assets/videos/mini_speech.mp4` (or update the script to match your filename)

### Automated Testing

**Run the test script:**
```bash
yarn test:ai
```

Or with a specific user ID:
```bash
yarn test:ai <user-id>
```

**What the script does:**
   - Automatically loads environment variables from `.env` file
   - Uploads `mini_speech.mp4` to Supabase Storage (`videos/` bucket)
   - Creates an analysis job via the AI Edge Function
   - Polls for completion and shows results

## Manual Testing

If you prefer manual testing:

```bash
# 1. Start local Supabase
yarn supabase start

# 2. Serve the function
yarn supabase functions serve ai-analyze-video --no-verify-jwt

# 3. Upload video via Supabase Studio or your app

# 4. Call the function
curl -X POST http://127.0.0.1:54321/functions/v1/ai-analyze-video \
  -H "Content-Type: application/json" \
  -d '{"videoPath":"videos/test.mp4","userId":"user-id","videoSource":"uploaded_video"}'

# 5. Check status
curl "http://127.0.0.1:54321/functions/v1/ai-analyze-video/status?id=<analysis-id>"
```

## Notes

- Video files are gitignored to avoid committing large files
- Use short test videos (under 10MB) for faster testing
- The function expects videos in the `videos` Supabase Storage bucket
