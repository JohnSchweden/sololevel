# Video Analysis & Feedback System - Backend Integration Analysis

> **Instructions**: This analysis focuses on the complete AI-powered video analysis backend, including Supabase integration, AI pipeline, and Edge Functions for the Video Analysis & Feedback System (US-VF-01 through US-VF-09). Cross-reference with `analysis-feature.md` for business logic and `analysis-ui.md` for data presentation.

## Test-Driven Backend Integration Analysis Phase
- [x] **AI Pipeline API Contract Tests**: Define TRD-compliant Edge Function interfaces
  - [x] Write API endpoint tests with request/response schemas (per TRD specifications)
    - [x] AI analysis endpoint: `POST /functions/v1/ai-analyze-video`
    - [x] Analysis status endpoint: `GET /functions/v1/analysis-status?id={analysisId}`
    - [x] TTS generation endpoint: `POST /functions/v1/tts`
  - [x] Define error response format and status code tests
    - [x] 404 for non-existent analyses
    - [x] 403 for unauthorized analysis access
    - [x] 500 for AI service failures
    - [x] 408 for analysis timeout (> 10s per TRD)
  - [x] Test authentication and authorization requirements
    - [x] JWT token validation for Edge Function access
    - [x] User ownership validation for analysis access via RLS
    - [x] Service role authentication for AI pipeline operations
  - [x] Document rate limiting and quota behavior tests
    - [x] Analysis rate limiting (3 concurrent jobs per user per TRD)
    - [x] Video upload quota (100MB max per TRD)
    - [x] AI service quota management and cost controls

- [x] **TRD-Compliant Database Schema Tests**: Validate AI analysis data model
  - [x] Test table relationships and foreign key constraints (per TRD schema)
    - [x] Analyses table → auth.users relationship
    - [x] Analysis_metrics table → Analyses table relationship
    - [x] Profiles table → auth.users relationship
  - [x] Validate RLS (Row Level Security) policy enforcement
    - [x] Users can only access their own analyses via `(select auth.uid()) = user_id`
    - [x] Service role can access analyses for AI processing
    - [x] Analysis metrics inherit access from parent analysis
  - [x] Test data validation rules and triggers
    - [x] Analysis status must be in ('queued','processing','completed','failed')
    - [x] Video duration constraints (5s-60s per TRD)
    - [x] File size limits (100MB max per TRD)
    - [x] Analysis timeout enforcement (10s max per TRD)
  - [x] Document migration and rollback test scenarios
    - [x] Schema versioning with bigint identity primary keys
    - [x] Data migration from video-centric to analysis-centric model
    - [x] Rollback procedures for AI pipeline schema changes

- [x] **AI Pipeline Real-time Integration Tests**: Analysis-centric live updates
  - [x] Test real-time subscription setup and teardown
    - [x] Analysis status updates subscription (analyses table)
    - [x] Analysis metrics updates subscription (analysis_metrics table)
    - [x] Pose data streaming via broadcast channels
    - [x] AI pipeline progress updates subscription
  - [x] Validate data synchronization and conflict resolution
    - [x] Concurrent analysis updates handling
    - [x] AI pipeline stage conflict resolution
    - [x] Real-time pose data streaming synchronization
  - [x] Test connection handling and reconnection logic
    - [x] Network interruption recovery during analysis
    - [x] WebSocket reconnection with exponential backoff
    - [x] Analysis state preservation on reconnection
  - [x] Document subscription performance and scaling tests
    - [x] Multiple concurrent analysis subscriptions
    - [x] High-frequency pose data streaming performance
    - [x] AI pipeline real-time update scalability

## Supabase Database Design Phase
- [x] **TRD-Compliant Schema Definition**: AI analysis-centric database design
```sql
-- AI Video Analysis Database Schema (per TRD specifications)
comment on schema public is 'AI Video Analysis System Database';

-- User profiles table (per TRD)
create table public.profiles (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade,
  username text unique not null,
  created_at timestamptz default now()
);

comment on table public.profiles is 'User profile information';

-- Main analyses table (per TRD)
create table public.analyses (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade,
  video_url text not null,
  status text check (status in ('queued','processing','completed','failed')) default 'queued',
  summary_text text,
  ssml text,
  audio_url text,
  created_at timestamptz default now()
);

comment on table public.analyses is 'AI video analysis jobs and results';

-- Analysis metrics table (per TRD)
create table public.analysis_metrics (
  id bigint generated always as identity primary key,
  analysis_id bigint references analyses(id) on delete cascade,
  metric_key text not null,
  metric_value numeric not null,
  unit text not null
);

comment on table public.analysis_metrics is 'Quantified performance metrics from AI analysis';

-- Indexes for performance (following Supabase patterns)
create index idx_profiles_user_id on public.profiles(user_id);
create index idx_analyses_user_id on public.analyses(user_id);
create index idx_analyses_status on public.analyses(status);
create index idx_analyses_created_at on public.analyses(created_at desc);
create index idx_analysis_metrics_analysis_id on public.analysis_metrics(analysis_id);
create index idx_analysis_metrics_key on public.analysis_metrics(analysis_id, metric_key);
```

- [x] **RLS (Row Level Security) Policies**: TRD-compliant access control
```sql
-- Enable RLS on all tables (per Supabase patterns)
alter table public.profiles enable row level security;
alter table public.analyses enable row level security;
alter table public.analysis_metrics enable row level security;

-- Profiles policies
create policy "Users can view all profiles"
  on public.profiles for select
  to authenticated, anon
  using (true);

create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Analyses policies (per TRD RLS requirements)
create policy "Users can view own analyses"
  on public.analyses for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert own analyses"
  on public.analyses for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Service role can manage all analyses"
  on public.analyses for all
  to service_role
  using (true)
  with check (true);

-- Analysis metrics policies (inherit from parent analysis)
create policy "Users can view own analysis metrics"
  on public.analysis_metrics for select
  to authenticated
  using (
    exists (
      select 1 from public.analyses
      where analyses.id = analysis_metrics.analysis_id
      and analyses.user_id = (select auth.uid())
    )
  );

create policy "Service role can manage all metrics"
  on public.analysis_metrics for all
  to service_role
  using (true)
  with check (true);
```
  - [x] **User Data Isolation**: 
    - Users can only access their own analyses via `(select auth.uid()) = user_id`
    - Analysis metrics inherit access from parent analysis
    - Service role has full access for AI pipeline operations
  - [x] **Edge Function Access**: 
    - Service role authentication for AI pipeline operations
    - Secure analysis job creation and updates
    - Real-time notification permissions
  - [x] **Audit Trail**: 
    - Track analysis requests and completion
    - Log AI pipeline performance metrics
    - Monitor user analysis history and patterns

- [x] **Database Indexes and Performance**: AI analysis query optimization
  - [x] **Primary Indexes**: 
    - Efficient bigint identity primary key lookups for analyses
    - Foreign key indexes for user_id and analysis_id joins
    - Optimized for RLS policy performance
  - [x] **Analysis Query Indexes**: 
    - User + status queries for analysis lists (`idx_analyses_user_id`, `idx_analyses_status`)
    - Time-based queries for analysis history (`idx_analyses_created_at desc`)
    - Metrics lookup optimization (`idx_analysis_metrics_analysis_id`)
  - [x] **Composite Indexes**: 
    - Analysis + metric key queries for performance dashboards
    - User + creation time for paginated analysis history
    - Status + creation time for AI pipeline monitoring

## Supabase Storage Integration Phase
- [x] **TRD-Compliant Storage Strategy**: AI analysis asset management
```typescript
// TRD Storage Bucket Structure (per TRD line 160)
const STORAGE_BUCKETS = {
  raw: 'raw',           // Video uploads
  processed: 'processed' // Thumbnails, AAC/MP3 audio
};

// File Organization:
// raw/{userId}/{timestamp}/video.mp4
// processed/{analysisId}/thumbnail.jpg
// processed/{analysisId}/feedback_audio.aac
// processed/{analysisId}/feedback_audio.mp3

// Storage Path Examples:
const storagePaths = {
  // Raw video uploads
  videoUpload: `raw/${userId}/${Date.now()}/video.mp4`,
  
  // Processed analysis assets
  thumbnail: `processed/${analysisId}/thumbnail.jpg`,
  audioAAC: `processed/${analysisId}/feedback_audio.aac`,
  audioMP3: `processed/${analysisId}/feedback_audio.mp3`,
};
```

- [x] **Storage Policies and Security**: TRD-compliant access control
```sql
-- Raw bucket policies (video uploads)
create policy "Users can upload to own raw folder"
  on storage.objects for insert
  with check (
    bucket_id = 'raw' and
    (storage.foldername(name))[1] = (select auth.uid()::text)
  );

create policy "Users can view own raw files"
  on storage.objects for select
  using (
    bucket_id = 'raw' and
    (storage.foldername(name))[1] = (select auth.uid()::text)
  );

-- Processed bucket policies (analysis results)
create policy "Service role can manage processed files"
  on storage.objects for all
  to service_role
  using (bucket_id = 'processed')
  with check (bucket_id = 'processed');

create policy "Users can view own processed files"
  on storage.objects for select
  using (
    bucket_id = 'processed' and
    exists (
      select 1 from public.analyses
      where analyses.id::text = (storage.foldername(name))[1]
      and analyses.user_id = (select auth.uid())
    )
  );
```
  - [x] **Upload Constraints**: 
    - File size limits (100MB max per TRD)
    - File type validation (MP4/MOV only per TRD)
    - Duration constraints (5s-60s per TRD)
  - [x] **Signed URL Strategy**: 
    - Short TTL for security (1 hour max)
    - Analysis-specific access control
    - Rate limiting on URL generation
  - [x] **AI Pipeline File Management**: 
    - Automatic cleanup of temporary files
    - AAC/MP3 conversion and storage
    - Thumbnail generation and caching

- [x] **File Processing Pipeline**: Video optimization and thumbnail generation
  - [x] **Video Compression**: 
    - Optimize for streaming and storage
    - Multiple quality levels (720p, 1080p)
    - Adaptive bitrate streaming
  - [x] **Thumbnail Generation**: 
    - Extract representative frames
    - Multiple thumbnail sizes
    - Automatic thumbnail selection
  - [x] **Format Conversion**: 
    - Ensure cross-platform compatibility
    - H.264 encoding for broad support
    - AAC audio encoding
  - [x] **Metadata Extraction**: 
    - Duration, resolution, codec information
    - Frame rate and bitrate analysis
    - Audio track information

## Supabase Edge Functions Phase
- [x] **TRD AI Analysis Pipeline**: Complete AI-powered video analysis
```typescript
// AI Analysis Edge Function (per TRD specifications)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req: Request) => {
  if (req.method === 'POST' && new URL(req.url).pathname === '/ai-analyze-video') {
    return await aiAnalyzeVideo(req);
  }
  
  if (req.method === 'POST' && new URL(req.url).pathname === '/tts') {
    return await generateTTS(req);
  }
  
  return new Response('Not Found', { status: 404 });
});

async function aiAnalyzeVideo(req: Request): Promise<Response> {
  const { videoPath, userId } = await req.json();
  
  // Create analysis record
  const { data: analysis } = await supabase
    .from('analyses')
    .insert({
      user_id: userId,
      video_url: videoPath,
      status: 'queued'
    })
    .select()
    .single();
  
  // Start AI pipeline (per TRD flow)
  EdgeRuntime.waitUntil(processAIPipeline(analysis.id, videoPath));
  
  return new Response(JSON.stringify({ analysisId: analysis.id }));
}

async function processAIPipeline(analysisId: number, videoPath: string) {
  try {
    // Update status to processing
    await updateAnalysisStatus(analysisId, 'processing');
    
    // 1. Frame Extraction
    const frames = await extractVideoFrames(videoPath);
    
    // 2. MoveNet Lightning Pose Detection (per TRD)
    const poseData = await runMoveNetLightning(frames);
    
    // 3. Gemini 2.5 Video/Voice Analysis (per TRD)
    const analysis = await gemini25VideoAnalysis(videoPath, poseData);
    
    // 4. Gemini LLM SSML Generation (per TRD)
    const ssml = await geminiLLMFeedback(analysis);
    
    // 5. Gemini TTS 2.0 Audio Generation (per TRD)
    const audioUrl = await geminiTTS20(ssml);
    
    // 6. Store results and update status
    await storeAnalysisResults(analysisId, {
      summary_text: analysis.summary,
      ssml: ssml,
      audio_url: audioUrl,
      status: 'completed'
    });
    
    // 7. Real-time notification (per TRD)
    await notifyAnalysisComplete(analysisId);
    
  } catch (error) {
    await updateAnalysisStatus(analysisId, 'failed');
    console.error('AI Pipeline failed:', error);
  }
}
```

- [x] **Authentication and Authorization**: Secure function access
  - [x] **JWT Token Validation**: 
    - Verify user authentication
    - Validate user permissions
    - Check rate limits
  - [x] **Permission Checking**: 
    - Validate user access to resources
    - Check video ownership
    - Verify analysis permissions
  - [x] **Service Account Authentication**: 
    - Internal service access
    - System-level permissions
    - Background job authentication
  - [x] **Rate Limiting**: 
    - Prevent abuse and ensure fair usage
    - Per-user analysis limits
    - Global system limits

- [x] **Error Handling and Monitoring**: Robust function execution
  - [x] **Structured Logging**: 
    - Correlation IDs and error tracking
    - Performance metrics logging
    - User action logging
  - [x] **Retry Logic**: 
    - Handle transient failures gracefully
    - Exponential backoff for retries
    - Circuit breaker for external services
  - [x] **Circuit Breaker**: 
    - Prevent cascade failures
    - Service health monitoring
    - Automatic recovery
  - [x] **Performance Monitoring**: 
    - Execution time and resource usage
    - Memory and CPU monitoring
    - Error rate tracking

## AI Pipeline Integration Phase
- [x] **Pose Detection Service**: Movement analysis integration
  - [x] **Model Selection**: 
    - MediaPipe Pose for real-time detection
    - TensorFlow.js for web compatibility
    - Custom models for specific use cases
  - [x] **Input Processing**: 
    - Video frame extraction and preprocessing
    - Frame rate optimization
    - Resolution scaling
  - [x] **Output Processing**: 
    - Pose keypoint extraction and validation
    - Movement pattern analysis
    - Confidence score calculation
  - [x] **Performance Optimization**: 
    - Batch processing for efficiency
    - Model caching and optimization
    - GPU acceleration when available

- [x] **Voice Analysis Service**: Speech and audio processing
  - [x] **Audio Extraction**: 
    - Separate audio track from video
    - Audio format conversion
    - Quality optimization
  - [x] **Speech Recognition**: 
    - Convert speech to text
    - Language detection
    - Speaker identification
  - [x] **Voice Quality Analysis**: 
    - Pace, tone, clarity metrics
    - Volume and pitch analysis
    - Speech pattern recognition
  - [x] **Language Processing**: 
    - Content analysis and insights
    - Sentiment analysis
    - Keyword extraction

- [x] **LLM Feedback Generation**: AI-powered coaching feedback
  - [x] **Prompt Engineering**: 
    - Effective coaching prompt design
    - Context-aware feedback generation
    - Personalized feedback styles
  - [x] **Context Integration**: 
    - Combine pose and voice analysis
    - Historical performance data
    - User preferences and goals
  - [x] **Response Formatting**: 
    - Structured feedback output
    - Timestamp-based feedback
    - Priority and confidence scoring
  - [x] **Quality Assurance**: 
    - Feedback relevance and accuracy
    - Bias detection and mitigation
    - Human review for edge cases

- [x] **Text-to-Speech Service**: Audio feedback generation
  - [x] **Voice Selection**: 
    - Appropriate coaching voice
    - Gender and accent options
    - Emotional tone matching
  - [x] **SSML Integration**: 
    - Enhanced speech synthesis
    - Pause and emphasis control
    - Natural speech patterns
  - [x] **Audio Quality**: 
    - Clear, professional audio output
    - Noise reduction and enhancement
    - Consistent audio levels
  - [x] **Caching Strategy**: 
    - Avoid regenerating identical feedback
    - Audio file caching
    - CDN distribution
  - [x] **Audio Feedback Pipeline**: 
    - Gemini TTS 2.0 integration for high-quality speech
    - AAC/MP3 format conversion for 75%+ size reduction
    - Mobile-optimized audio compression
    - Timestamp synchronization with video feedback
    - Audio metadata extraction (duration, bitrate)
    - Progressive audio streaming for large files

## Real-time Integration Phase
- [x] **Supabase Realtime Setup**: Live data synchronization
```typescript
// Real-time Subscription for Video Player
const subscription = supabase
  .channel('video_analysis')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'videos',
    filter: `id=eq.${videoId}`
  }, (payload) => {
    // Handle video status updates
    updateVideoStatus(payload.new);
  })
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'feedback_items',
    filter: `video_id=eq.${videoId}`
  }, (payload) => {
    // Handle new feedback items
    addFeedbackItem(payload.new);
    
    // Handle audio feedback availability
    if (payload.new.audio_url) {
      showAudioFeedback(payload.new);
    }
  })
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'analysis_results',
    filter: `video_id=eq.${videoId}`
  }, (payload) => {
    // Handle analysis progress updates
    updateAnalysisProgress(payload.new);
  })
  .subscribe();
```

- [x] **Connection Management**: Robust real-time connectivity
  - [x] **Connection Lifecycle**: 
    - Setup, maintenance, cleanup
    - Automatic reconnection
    - Connection health monitoring
  - [x] **Reconnection Logic**: 
    - Handle network interruptions
    - Exponential backoff for reconnection
    - State synchronization on reconnect
  - [x] **Subscription Filtering**: 
    - Efficient data filtering
    - User-specific subscriptions
    - Resource-based filtering
  - [x] **Error Handling**: 
    - Connection failure recovery
    - Subscription error handling
    - Graceful degradation

- [x] **Data Synchronization**: Consistent state management
  - [x] **Optimistic Updates**: 
    - Immediate UI feedback
    - Rollback on failure
    - Conflict resolution
  - [x] **Conflict Resolution**: 
    - Handle concurrent modifications
    - Last-write-wins strategy
    - User notification of conflicts
  - [x] **Cache Invalidation**: 
    - Keep client data fresh
    - Selective cache updates
    - Background refresh
  - [x] **Offline Support**: 
    - Queue updates for later sync
    - Offline data access
    - Sync on reconnection

## TDD Backend Implementation Roadmap

### Phase 1: TDD Database Foundation [Schema/RLS]
- [x] **Schema Validation Tests**: Table structure and constraints
  - [x] Video table schema tests
  - [x] Analysis results table tests
  - [x] Feedback items table tests
- [x] **RLS Policy Tests**: Access control enforcement
  - [x] User data isolation tests
  - [x] Admin access tests
  - [x] Service account access tests
- [x] **Migration Tests**: Schema evolution and rollback
  - [x] Schema versioning tests
  - [x] Data migration tests
  - [x] Rollback procedure tests
- [x] **Performance Tests**: Query optimization validation
  - [x] Index effectiveness tests
  - [x] Query performance tests
  - [x] Concurrent access tests

### Phase 2: TDD Storage Integration [Files/Assets]
- [x] **Upload Tests**: File upload and validation
  - [x] Video file upload tests
  - [x] File size validation tests
  - [x] File type validation tests
- [x] **Access Control Tests**: Storage policy enforcement
  - [x] User access control tests
  - [x] Signed URL generation tests
  - [x] File permission tests
- [x] **Processing Tests**: File transformation and optimization
  - [x] Video compression tests
  - [x] Thumbnail generation tests
  - [x] Format conversion tests
- [x] **Cleanup Tests**: Orphaned file management
  - [x] File cleanup tests
  - [x] Storage quota tests
  - [x] Lifecycle management tests

### Phase 3: TDD Edge Functions [AI Pipeline]
- [x] **Function Execution Tests**: Core processing logic
  - [x] Video analysis pipeline tests
  - [x] Error handling tests
  - [x] Performance tests
- [x] **Authentication Tests**: Security and access control
  - [x] JWT validation tests
  - [x] Permission checking tests
  - [x] Rate limiting tests
- [x] **Error Handling Tests**: Failure scenario management
  - [x] Network failure tests
  - [x] Service failure tests
  - [x] Recovery procedure tests
- [x] **Performance Tests**: Execution time and resource usage
  - [x] Execution time tests
  - [x] Memory usage tests
  - [x] Resource optimization tests

### Phase 4: TDD Real-time Integration [Live Updates]
- [x] **Subscription Tests**: Real-time data flow
  - [x] Video status subscription tests
  - [x] Feedback data subscription tests
  - [x] Analysis progress subscription tests
- [x] **Connection Tests**: Network resilience
  - [x] Connection lifecycle tests
  - [x] Reconnection tests
  - [x] Error recovery tests
- [x] **Synchronization Tests**: Data consistency
  - [x] Data sync tests
  - [x] Conflict resolution tests
  - [x] Offline sync tests
- [x] **Performance Tests**: Subscription scaling
  - [x] Concurrent subscription tests
  - [x] Large dataset tests
  - [x] Memory usage tests

### Phase 5: TDD AI Pipeline Integration [ML Services]
- [x] **Model Integration Tests**: AI service connectivity
  - [x] Pose detection model tests
  - [x] Voice analysis model tests
  - [x] LLM integration tests
  - [x] TTS service integration tests
- [x] **Data Processing Tests**: Input/output validation
  - [x] Video preprocessing tests
  - [x] Audio extraction tests
  - [x] Result validation tests
  - [x] Audio feedback generation tests
  - [x] TTS audio format conversion tests
- [x] **Quality Assurance Tests**: Result accuracy and relevance
  - [x] Feedback quality tests
  - [x] Accuracy validation tests
  - [x] Bias detection tests
- [x] **Performance Tests**: Processing time and throughput
  - [x] Processing time tests
  - [x] Throughput tests
  - [x] Resource usage tests
  - [x] Audio feedback generation performance tests
  - [x] TTS service response time tests

## Quality Gates
- [x] **API Contract Compliance**: All endpoints match documented schemas
- [x] **Security Validation**: RLS policies and authentication working
- [x] **Performance Benchmarks**: Response times within SLA targets
- [x] **Data Integrity**: Consistent data across all services

## Documentation Requirements
- [x] **API Documentation**: Endpoint schemas and examples
- [x] **Database Documentation**: Schema, relationships, and policies
- [x] **Integration Documentation**: Service dependencies and flows
- [x] **Monitoring Documentation**: Alerts, metrics, and troubleshooting

## Cross-References
- **Feature Logic**: See `analysis-feature.md` for business logic integration
- **UI Integration**: See `analysis-ui.md` for data presentation requirements
- **Platform Implementation**: See `analysis-platform.md` for client-side integration
