# [FeatureName] Backend Integration Analysis Template

> **Instructions**: Copy this template to `docs/features/[feature-name]/analysis-backend.md` and complete all sections systematically before implementation. This template focuses on Supabase integration, AI pipeline, and backend services. Cross-reference with `analysis-feature.md` for business logic and `analysis-ui.md` for data presentation.

## Test-Driven Backend Integration Analysis Phase
- [ ] **API Contract Tests**: Define backend service interfaces
  - [ ] Write API endpoint tests with request/response schemas
  - [ ] Define error response format and status code tests
  - [ ] Test authentication and authorization requirements
  - [ ] Document rate limiting and quota behavior tests
- [ ] **Database Schema Tests**: Validate data model and constraints
  - [ ] Test table relationships and foreign key constraints
  - [ ] Validate RLS (Row Level Security) policy enforcement
  - [ ] Test data validation rules and triggers
  - [ ] Document migration and rollback test scenarios
- [ ] **Real-time Integration Tests**: Subscription and live updates
  - [ ] Test real-time subscription setup and teardown
  - [ ] Validate data synchronization and conflict resolution
  - [ ] Test connection handling and reconnection logic
  - [ ] Document subscription performance and scaling tests

## Supabase Database Design Phase
- [ ] **Table Schema Definition**: Map wireframe data to database tables
```sql
-- Example Schema for Video Analysis Feature
CREATE TABLE videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  file_path TEXT NOT NULL,
  thumbnail_path TEXT,
  duration_seconds INTEGER,
  file_size_bytes BIGINT,
  status video_status DEFAULT 'uploading',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE analysis_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
  analysis_type analysis_type_enum NOT NULL,
  result_data JSONB NOT NULL,
  confidence_score DECIMAL(3,2),
  processing_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can only access their own videos" 
  ON videos FOR ALL 
  USING (auth.uid() = user_id);
```

- [ ] **RLS (Row Level Security) Policies**: Data access control
  - [ ] **User Data Isolation**: Users can only access their own data
  - [ ] **Admin Access Patterns**: Administrative access for support/debugging
  - [ ] **Service Account Access**: Backend service authentication
  - [ ] **Audit Trail**: Track data access and modifications

- [ ] **Database Indexes and Performance**: Query optimization
  - [ ] **Primary Indexes**: Efficient primary key lookups
  - [ ] **Foreign Key Indexes**: Join performance optimization
  - [ ] **Search Indexes**: Full-text search and filtering
  - [ ] **Composite Indexes**: Multi-column query optimization

## Supabase Storage Integration Phase
- [ ] **File Upload Strategy**: Video and asset management
```typescript
// Example Storage Structure
/videos/
  /{user_id}/
    /{video_id}/
      /original.mp4          // Original uploaded video
      /thumbnail.jpg         // Generated thumbnail
      /processed.mp4         // Processed/optimized video
      /analysis/
        /pose_data.json      // Pose detection results
        /audio_analysis.json // Voice analysis results
        /feedback.json       // LLM feedback results
        /feedback_audio.mp3  // TTS audio file
```

- [ ] **Storage Policies and Security**: Access control and signed URLs
  - [ ] **Upload Policies**: User can upload to their own folders
  - [ ] **Download Policies**: Access control for video playback
  - [ ] **Signed URL Generation**: Temporary access for client apps
  - [ ] **File Size and Type Validation**: Upload constraints and security

- [ ] **File Processing Pipeline**: Video optimization and thumbnail generation
  - [ ] **Video Compression**: Optimize for streaming and storage
  - [ ] **Thumbnail Generation**: Extract representative frames
  - [ ] **Format Conversion**: Ensure cross-platform compatibility
  - [ ] **Metadata Extraction**: Duration, resolution, codec information

## Supabase Edge Functions Phase
- [ ] **AI Analysis Pipeline**: Video processing and feedback generation
```typescript
// Example Edge Function Structure
export async function analyzeVideo(videoId: string) {
  // 1. Download video from storage
  const videoFile = await downloadVideo(videoId);
  
  // 2. Run pose detection
  const poseData = await detectPose(videoFile);
  
  // 3. Analyze audio/speech
  const audioAnalysis = await analyzeAudio(videoFile);
  
  // 4. Generate LLM feedback
  const feedback = await generateFeedback(poseData, audioAnalysis);
  
  // 5. Convert feedback to speech
  const audioFeedback = await textToSpeech(feedback.text);
  
  // 6. Store results
  await storeAnalysisResults(videoId, {
    poseData,
    audioAnalysis,
    feedback,
    audioFeedback
  });
  
  // 7. Notify client via real-time
  await notifyAnalysisComplete(videoId);
}
```

- [ ] **Authentication and Authorization**: Secure function access
  - [ ] **JWT Token Validation**: Verify user authentication
  - [ ] **Permission Checking**: Validate user access to resources
  - [ ] **Service Account Authentication**: Internal service access
  - [ ] **Rate Limiting**: Prevent abuse and ensure fair usage

- [ ] **Error Handling and Monitoring**: Robust function execution
  - [ ] **Structured Logging**: Correlation IDs and error tracking
  - [ ] **Retry Logic**: Handle transient failures gracefully
  - [ ] **Circuit Breaker**: Prevent cascade failures
  - [ ] **Performance Monitoring**: Execution time and resource usage

## AI Pipeline Integration Phase
- [ ] **Pose Detection Service**: Movement analysis integration
  - [ ] **Model Selection**: Choose appropriate pose detection model
  - [ ] **Input Processing**: Video frame extraction and preprocessing
  - [ ] **Output Processing**: Pose keypoint extraction and validation
  - [ ] **Performance Optimization**: Batch processing and caching

- [ ] **Voice Analysis Service**: Speech and audio processing
  - [ ] **Audio Extraction**: Separate audio track from video
  - [ ] **Speech Recognition**: Convert speech to text
  - [ ] **Voice Quality Analysis**: Pace, tone, clarity metrics
  - [ ] **Language Processing**: Content analysis and insights

- [ ] **LLM Feedback Generation**: AI-powered coaching feedback
  - [ ] **Prompt Engineering**: Effective coaching prompt design
  - [ ] **Context Integration**: Combine pose and voice analysis
  - [ ] **Response Formatting**: Structured feedback output
  - [ ] **Quality Assurance**: Feedback relevance and accuracy

- [ ] **Text-to-Speech Service**: Audio feedback generation
  - [ ] **Voice Selection**: Appropriate coaching voice
  - [ ] **SSML Integration**: Enhanced speech synthesis
  - [ ] **Audio Quality**: Clear, professional audio output
  - [ ] **Caching Strategy**: Avoid regenerating identical feedback

## Real-time Integration Phase
- [ ] **Supabase Realtime Setup**: Live data synchronization
```typescript
// Example Real-time Subscription
const subscription = supabase
  .channel('video_analysis')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'videos',
    filter: `user_id=eq.${userId}`
  }, (payload) => {
    // Handle video status updates
    updateVideoStatus(payload.new);
  })
  .subscribe();
```

- [ ] **Connection Management**: Robust real-time connectivity
  - [ ] **Connection Lifecycle**: Setup, maintenance, cleanup
  - [ ] **Reconnection Logic**: Handle network interruptions
  - [ ] **Subscription Filtering**: Efficient data filtering
  - [ ] **Error Handling**: Connection failure recovery

- [ ] **Data Synchronization**: Consistent state management
  - [ ] **Optimistic Updates**: Immediate UI feedback
  - [ ] **Conflict Resolution**: Handle concurrent modifications
  - [ ] **Cache Invalidation**: Keep client data fresh
  - [ ] **Offline Support**: Queue updates for later sync

## TDD Backend Implementation Roadmap

### Phase 1: TDD Database Foundation [Schema/RLS]
- [ ] **Schema Validation Tests**: Table structure and constraints
- [ ] **RLS Policy Tests**: Access control enforcement
- [ ] **Migration Tests**: Schema evolution and rollback
- [ ] **Performance Tests**: Query optimization validation

### Phase 2: TDD Storage Integration [Files/Assets]
- [ ] **Upload Tests**: File upload and validation
- [ ] **Access Control Tests**: Storage policy enforcement
- [ ] **Processing Tests**: File transformation and optimization
- [ ] **Cleanup Tests**: Orphaned file management

### Phase 3: TDD Edge Functions [AI Pipeline]
- [ ] **Function Execution Tests**: Core processing logic
- [ ] **Authentication Tests**: Security and access control
- [ ] **Error Handling Tests**: Failure scenario management
- [ ] **Performance Tests**: Execution time and resource usage

### Phase 4: TDD Real-time Integration [Live Updates]
- [ ] **Subscription Tests**: Real-time data flow
- [ ] **Connection Tests**: Network resilience
- [ ] **Synchronization Tests**: Data consistency
- [ ] **Performance Tests**: Subscription scaling

### Phase 5: TDD AI Pipeline Integration [ML Services]
- [ ] **Model Integration Tests**: AI service connectivity
- [ ] **Data Processing Tests**: Input/output validation
- [ ] **Quality Assurance Tests**: Result accuracy and relevance
- [ ] **Performance Tests**: Processing time and throughput

## Quality Gates
- [ ] **API Contract Compliance**: All endpoints match documented schemas
- [ ] **Security Validation**: RLS policies and authentication working
- [ ] **Performance Benchmarks**: Response times within SLA targets
- [ ] **Data Integrity**: Consistent data across all services

## Documentation Requirements
- [ ] **API Documentation**: Endpoint schemas and examples
- [ ] **Database Documentation**: Schema, relationships, and policies
- [ ] **Integration Documentation**: Service dependencies and flows
- [ ] **Monitoring Documentation**: Alerts, metrics, and troubleshooting

## Cross-References
- **Feature Logic**: See `analysis-feature.md` for business logic integration
- **UI Integration**: See `analysis-ui.md` for data presentation requirements
- **Platform Implementation**: See `analysis-platform.md` for client-side integration
