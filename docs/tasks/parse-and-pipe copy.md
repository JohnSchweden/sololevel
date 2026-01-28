This is an excellent cross-check analysis! You've identified critical gaps that need resolution before implementation. Let me address each issue systematically.

## 🎯 **Resolving Critical Gaps**

### **1. ARCHITECTURAL CONFLICT: Phase Architecture** 🔴

**Resolution: Hybrid Single-Phase Architecture**

The 2-phase trigger system should **stay**, but Phase 1 becomes a "streaming pipeline with progressive completion":

```
Phase 1 (INSERT trigger → /webhook - EXPANDED):
├─ Video analysis streaming (Gemini 2.0 Flash)
├─ Parse feedback incrementally from JSON stream
├─ For FIRST feedback only:
│  ├─ Generate SSML immediately
│  ├─ Stream TTS → client + storage (tee)
│  ├─ Update progress: 20%
│  └─ Mark: first_feedback_ready = true
├─ Continue parsing remaining feedback (2-N)
├─ Store all feedback in analysis_feedback table
└─ Status: analysis_complete (80% progress)

Phase 2 (UPDATE trigger → /post-analyze - PRESERVED):
├─ Check: if first_feedback_ready = true, skip feedback[0]
├─ Generate SSML for feedback 1-N (sequential)
├─ Generate TTS for feedback 1-N (sequential)
├─ Upload to storage → CDN cache
└─ Status: completed (100% progress)
```

**Key points:**
- Phase 1 handles ONLY first feedback TTS (streaming)
- Phase 2 handles remaining feedback TTS (batch)
- No trigger removal needed
- Backward compatible with existing jobs

---

### **2. DATABASE SCHEMA GAPS** 🟡

**Resolution: Add streaming metadata without breaking schema**

```sql
-- Migration: 20260124_add_streaming_metadata.sql

ALTER TABLE analysis_jobs 
ADD COLUMN first_feedback_ready boolean DEFAULT false,
ADD COLUMN first_feedback_streamed_at timestamptz;

ALTER TABLE analysis_audio_segments
ADD COLUMN content_hash text,
ADD COLUMN cache_status text CHECK (cache_status IN ('HIT', 'MISS', 'GENERATED')),
ADD COLUMN generation_method text CHECK (generation_method IN ('streamed', 'batch'));

-- Index for cache lookups
CREATE INDEX idx_audio_segments_content_hash 
ON analysis_audio_segments(content_hash) 
WHERE content_hash IS NOT NULL;
```

**Answers:**
- `segment_index` stays (0 = first feedback, 1-N = remaining)
- `analysis_ssml_segments` stays (still needed for all feedback)
- `generation_method` tracks streamed vs batch generation
- Phase 2 checks `first_feedback_ready` to skip segment 0 if already done

---

### **3. STREAMING COMPLEXITY: Library Choice** 🟡

**Resolution: Validate Deno compatibility OR use fallback**

**Priority validation needed:**
```typescript
// Test in Supabase Edge Function
import { JSONParser } from 'https://esm.sh/@streamparser/json-whatwg@1.0.0';

// Fallback: Manual line-based parsing
function* parseStreamingJSON(textStream: ReadableStream<string>) {
  let buffer = '';
  for await (const chunk of textStream) {
    buffer += chunk;
    
    // Try to parse complete feedback objects
    const feedbackMatch = buffer.match(/"message":\s*"([^"]+)"/);
    if (feedbackMatch) {
      yield { message: feedbackMatch[1] };
      buffer = buffer.slice(feedbackMatch.index + feedbackMatch[0].length);
    }
  }
}
```

**Questions to answer:**
1. Test `@streamparser/json-whatwg` in Deno runtime **NOW**
2. If fails, implement regex-based fallback (simpler, more reliable)
3. Document which approach is used in TRD

---

### **4. STORAGE UPLOAD LIMITATION** 🟡

**Resolution: Accept buffering tradeoff for first feedback only**

**Reality check:**
- First feedback: ~13s audio = ~624KB PCM (24kHz × 16-bit × 13s)
- This is acceptable to buffer in memory for streaming
- Subsequent feedback (Phase 2): batch generation, no streaming needed

**Memory budget:**
```
First feedback (streamed):  624KB buffered
Remaining 3-9 feedback:     Generated in Phase 2 (no memory pressure)
Total Edge Function memory: ~1-2MB peak (acceptable)
```

**Trade-off acceptance:**
- ✅ Streaming to client = immediate playback
- ✅ Background upload = non-blocking
- ⚠️ Memory buffering = necessary evil for Supabase Storage limitation
- ✅ Only applies to FIRST feedback (single item)

---

### **5. CLIENT-SIDE PCM PLAYBACK** 🟡

**Resolution: Use existing audio infrastructure with streaming adapter**

**Current stack check (from TRD):**
- `useFeedbackAudioStore` - manages audio URLs/paths
- `useAudioControllerLazy` - lazy audio controller
- Audio stored as MP3/WAV URLs in storage

**Streaming PCM approach:**
```typescript
// Option A: Convert PCM stream to MP3 on Edge Function
// More compatible with existing audio infrastructure
const ttsStream = await geminiTTS.generateStream(ssml);
const mp3Stream = convertPCMToMP3Stream(ttsStream); // ffmpeg on edge
const [clientStream, storageStream] = mp3Stream.tee();

// Option B: Stream raw PCM to client
// Requires native module changes
// Use: @fugood/react-native-audio-pcm-stream (most maintained)
```

**Recommendation: Option A (MP3 conversion)**
- ✅ Works with existing `useFeedbackAudioStore` 
- ✅ No native module changes needed
- ✅ Better browser compatibility for web app
- ⚠️ Adds ~200ms conversion latency (acceptable)
- Total TTFB: 4.2s + 0.2s = 4.4s (still much better than 20-50s)

---

### **6. VOICE CONFIG SNAPSHOT** 🟡

**Resolution: Comprehensive content hash**

```typescript
// Complete hash for cache invalidation
function generateAudioContentHash(
  feedback: FeedbackItem,
  voiceSnapshot: VoiceSnapshot
): string {
  return createHash('sha256')
    .update(feedback.message)
    .update(feedback.timestamp.toString()) // Different timestamps = different feedback
    .update(voiceSnapshot.coach_gender)
    .update(voiceSnapshot.coach_mode)
    .update(voiceSnapshot.voice_name_used)
    .update(voiceSnapshot.tts_system_instruction || '')
    .update(voiceSnapshot.prompt_voice || '')
    .update(voiceSnapshot.prompt_personality || '')
    // Note: avatar_asset_key_used does NOT affect audio, skip
    .digest('hex')
    .substring(0, 16);
}
```

**Cache invalidation strategy:**
- Voice config changes → new hash → cache miss → regenerate
- Same message + same voice = cache hit
- Avatar changes don't invalidate audio cache (visual only)

---

### **7. REALTIME SUBSCRIPTION TIMING** 🟡

**Resolution: Enhanced progress events**

```typescript
// Client subscribes to analysis_jobs as before
supabase
  .channel('analysis')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'analysis_jobs',
    filter: `id=eq.${analysisId}`
  }, (payload) => {
    const job = payload.new;
    
    // New progress milestones:
    // 20% = first feedback ready (streamed)
    // 40% = feedback 2 ready
    // 60% = feedback 3 ready
    // 80% = all feedback ready (analysis_complete)
    // 100% = all audio generated (completed)
    
    if (job.first_feedback_ready && job.progress_percentage >= 20) {
      // UI: Enable playback for first feedback immediately
      startPlayback(0);
    }
    
    if (job.status === 'completed') {
      // UI: All feedback ready
      enableAllFeedback();
    }
  })
  .subscribe();
```

**Backward compatibility:**
- Existing clients ignore `first_feedback_ready` field
- New clients use progressive loading
- No breaking changes

---

### **8. TIMEOUT PROTECTION STRATEGY** 🟡

**Resolution: Layered timeout protection**

```typescript
// Phase 1 (streaming pipeline)
const STREAMING_TIMEOUTS = {
  videoAnalysis: 120_000,      // 120s (existing)
  jsonParsing: 30_000,         // 30s per feedback parse
  firstFeedbackTTS: 30_000,    // 30s for first TTS stream
  totalPhase1: 150_000         // 150s overall (existing)
};

// Phase 2 (batch TTS)
const BATCH_TIMEOUTS = {
  ssmlGeneration: 10_000,      // 10s per feedback
  ttsGeneration: 30_000,       // 30s per feedback
  totalPhase2: 150_000         // 150s overall (existing)
};

// stream.tee() background upload timeout
EdgeRuntime.waitUntil(
  uploadWithTimeout(storageStream, audioPath, 60_000) // 60s max
);
```

**Failure handling:**
```
If streaming fails:
├─ Mark first_feedback_ready = false
├─ Fall back to Phase 2 batch generation
└─ User sees: "Processing... (this may take longer than usual)"

If partial stream received:
├─ Discard partial audio
├─ Retry TTS generation in Phase 2
└─ Log error with correlation ID
```

---

## ✅ **Revised Architecture Summary**

### **Hybrid Single-Phase with Streaming**

```
INSERT trigger → /webhook (Phase 1 - Enhanced):
├─ 0-120s:   Video analysis (streaming)
├─ 3-5s:     First feedback parsed
├─ 3.1-4.1s: SSML + TTS streaming for feedback[0]
├─ 4.2s:     Stream to client (immediate playback)
├─ 4.2s:     Background upload via waitUntil
├─ 4.2-8s:   Parse remaining feedback (1-N)
└─ Status: analysis_complete, first_feedback_ready = true

UPDATE trigger → /post-analyze (Phase 2 - Preserved):
├─ Check: Skip feedback[0] if first_feedback_ready = true
├─ Generate SSML for feedback 1-N
├─ Generate TTS for feedback 1-N (sequential)
├─ Upload to storage → CDN cache
└─ Status: completed
```

---

## 📊 **Expected Performance (Revised)**

| Scenario | Current | Parse-and-Pipe (Hybrid) |
|----------|---------|------------------------|
| First feedback audio | 20-50s | **4-5s** ⚡ |
| All feedback audio | 20-50s | 15-25s |
| Cached feedback (CDN hit) | 20-50s | **0.1s** ⚡⚡ |

---

## 🎯 **Implementation Recommendation**

**Phased rollout:**

1. **Phase 1: Validate streaming (1 week)**
   - Test `@streamparser/json-whatwg` in Deno
   - Test Gemini TTS streaming with Edge Functions
   - Validate memory overhead with realistic feedback

2. **Phase 2: Implement hybrid pipeline (2 weeks)**
   - Add streaming to Phase 1 for first feedback only
   - Preserve Phase 2 for remaining feedback
   - Add `first_feedback_ready` flag + progress events

3. **Phase 3: Add CDN caching (1 week)**
   - Implement content hash + cache checks
   - Add `stream.tee()` branching
   - Test cache invalidation

4. **Phase 4: Client streaming (1 week)**
   - Convert PCM to MP3 on edge (Option A)
   - Update `useFeedbackAudioStore` for progressive loading
   - Add UI for "First feedback ready" state

**Total: ~5 weeks from validation to production**

Would you like me to elaborate on any specific gap, or shall we proceed with validation testing for the Deno streaming library?