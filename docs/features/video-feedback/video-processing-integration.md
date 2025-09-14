# Video Processing Integration: react-native-video-processing for Pose Detection

## Overview

This document specifies the integration of `react-native-video-processing` for real-time frame-by-frame pose detection on uploaded videos, maintaining consistency with the existing VisionCamera pose detection format.

## Architecture Integration

### Video Source Detection Pipeline

```typescript
interface VideoSource {
  type: 'live_recording' | 'uploaded_video';
  hasExistingPoseData: boolean;
  videoPath: string;
  poseDataPath?: string;
}

interface VideoProcessingPipeline {
  detectSource: (videoPath: string) => VideoSource;
  processVideo: (source: VideoSource) => Promise<PoseDetectionResult[]>;
  unifyPoseData: (poseData: PoseDetectionResult[]) => PoseDataBuffer;
}
```

### Data Flow

```mermaid
flowchart TD
    A[Video Upload] --> B{Video Source Detection}
    B -->|Live Recording| C[Load Existing Pose Data]
    B -->|Uploaded Video| D[react-native-video-processing]
    
    C --> E[VisionCamera PoseDetectionResult[]]
    D --> F[Frame Extraction 30fps]
    F --> G[MoveNet Lightning Processing]
    G --> H[Generate PoseDetectionResult[]]
    
    E --> I[Pose Data Unification]
    H --> I
    I --> J[Unified PoseDataBuffer]
    J --> K[AI Analysis Pipeline]
```

## Technical Specifications

### 1. Frame Extraction Configuration

```typescript
interface VideoProcessingConfig {
  // Frame extraction settings
  frameRate: number; // Default: 30fps
  frameInterval: number; // ms between frames (calculated from frameRate)
  maxFrames: number; // Maximum frames to process (1800 for 60s video)
  
  // Quality settings
  frameWidth: number; // Default: 256 (MoveNet input size)
  frameHeight: number; // Default: 256 (MoveNet input size)
  compressionQuality: number; // 0.0-1.0, default: 0.8
  
  // Performance settings
  batchSize: number; // Frames to process in batch, default: 10
  enableBackgroundProcessing: boolean; // Default: true
  enableProgressCallbacks: boolean; // Default: true
  
  // Memory management
  maxMemoryUsage: number; // MB, default: 100
  enableFramePooling: boolean; // Default: true
  autoCleanup: boolean; // Default: true
}

const DEFAULT_VIDEO_PROCESSING_CONFIG: VideoProcessingConfig = {
  frameRate: 30,
  frameInterval: 33.33, // 1000ms / 30fps
  maxFrames: 1800, // 60s * 30fps
  frameWidth: 256,
  frameHeight: 256,
  compressionQuality: 0.8,
  batchSize: 10,
  enableBackgroundProcessing: true,
  enableProgressCallbacks: true,
  maxMemoryUsage: 100,
  enableFramePooling: true,
  autoCleanup: true,
};
```

### 2. Pose Detection Integration

```typescript
interface VideoProcessingService {
  // Main processing method
  processVideoForPoseDetection: (
    videoPath: string,
    config?: Partial<VideoProcessingConfig>
  ) => Promise<PoseDetectionResult[]>;
  
  // Progress tracking
  onProgress: (callback: (progress: VideoProcessingProgress) => void) => void;
  
  // Memory management
  cleanup: () => void;
  getMemoryUsage: () => number;
}

interface VideoProcessingProgress {
  currentFrame: number;
  totalFrames: number;
  percentage: number;
  estimatedTimeRemaining: number; // ms
  currentFPS: number;
  memoryUsage: number; // MB
}
```

### 3. Data Format Consistency

The processed pose data must match the existing `PoseDetectionResult[]` format from VisionCamera:

```typescript
// Existing format from packages/app/features/CameraRecording/types/pose.ts
interface PoseDetectionResult {
  keypoints: PoseKeypoint[];
  confidence: number; // Overall pose confidence
  timestamp: number; // Detection timestamp in ms
  frameId?: string; // Optional frame identifier
}

interface PoseKeypoint {
  name: PoseKeypointName;
  x: number; // Normalized coordinate 0-1
  y: number; // Normalized coordinate 0-1
  confidence: number; // Confidence score 0-1
}

// Video processing must generate this exact format
interface VideoProcessingResult {
  poseData: PoseDetectionResult[];
  metadata: {
    totalFrames: number;
    processedFrames: number;
    averageConfidence: number;
    processingTime: number; // ms
    frameRate: number;
  };
}
```

## Implementation Strategy

### Phase 1: Core Integration

1. **Video Processing Service Setup**
   ```typescript
   // packages/app/services/videoProcessingService.ts
   export class VideoProcessingService {
     private config: VideoProcessingConfig;
     private poseDetector: MoveNetDetector;
     private progressCallback?: (progress: VideoProcessingProgress) => void;
     
     async processVideo(videoPath: string): Promise<PoseDetectionResult[]> {
       // Implementation details
     }
   }
   ```

2. **Frame Extraction Pipeline**
   ```typescript
   // Use react-native-video-processing for frame extraction
   import { VideoProcessing } from 'react-native-video-processing';
   
   async function extractFrames(videoPath: string, config: VideoProcessingConfig) {
     const frames = await VideoProcessing.getVideoFrames({
       source: videoPath,
       startTime: 0,
       endTime: -1, // Process entire video
       step: config.frameInterval,
       format: 'base64',
       quality: config.compressionQuality,
     });
     
     return frames;
   }
   ```

3. **Pose Detection Processing**
   ```typescript
   async function processPoseDetection(
     frames: string[], 
     config: VideoProcessingConfig
   ): Promise<PoseDetectionResult[]> {
     const results: PoseDetectionResult[] = [];
     
     for (let i = 0; i < frames.length; i += config.batchSize) {
       const batch = frames.slice(i, i + config.batchSize);
       const batchResults = await processBatch(batch, i);
       results.push(...batchResults);
       
       // Progress callback
       if (this.progressCallback) {
         this.progressCallback({
           currentFrame: i + batch.length,
           totalFrames: frames.length,
           percentage: ((i + batch.length) / frames.length) * 100,
           // ... other progress data
         });
       }
     }
     
     return results;
   }
   ```

### Phase 2: Performance Optimization

1. **Background Processing**
   - Use React Native's `InteractionManager` to avoid blocking UI
   - Implement worklet-based processing for better performance
   - Memory pooling for frame buffers

2. **Caching Strategy**
   - Cache processed pose data to avoid reprocessing
   - Implement LRU cache for frequently accessed videos
   - Store compressed pose data format

3. **Error Handling**
   - Graceful degradation for unsupported video formats
   - Retry logic for processing failures
   - Memory pressure handling

### Phase 3: Integration with Existing Systems

1. **Analysis Service Integration**
   ```typescript
   // packages/api/src/services/analysisService.ts
   export async function createAnalysisJobWithPoseDetection(
     videoRecordingId: number,
     videoPath: string
   ): Promise<AnalysisJob> {
     // Detect video source
     const source = await detectVideoSource(videoPath);
     
     let poseData: PoseDetectionResult[];
     
     if (source.hasExistingPoseData) {
       // Load existing pose data from VisionCamera recording
       poseData = await loadExistingPoseData(source.poseDataPath!);
     } else {
       // Process uploaded video for pose detection
       poseData = await videoProcessingService.processVideo(videoPath);
     }
     
     // Create analysis job with unified pose data
     return createAnalysisJob(videoRecordingId, poseData);
   }
   ```

2. **Real-time Progress Updates**
   ```typescript
   // Update analysis job progress during video processing
   videoProcessingService.onProgress((progress) => {
     updateAnalysisProgress(analysisJobId, progress.percentage * 0.3); // 30% for pose detection
   });
   ```

## Database Schema Updates

### Analysis Jobs Table Enhancement

```sql
-- Add video processing metadata to analysis_jobs table
ALTER TABLE public.analysis_jobs 
ADD COLUMN video_source text check (video_source in ('live_recording', 'uploaded_video')) default 'uploaded_video',
ADD COLUMN pose_processing_time integer, -- ms
ADD COLUMN pose_frame_count integer,
ADD COLUMN pose_average_confidence numeric;

-- Add index for video source queries
CREATE INDEX idx_analysis_jobs_video_source ON public.analysis_jobs(video_source);
```

### Pose Data Storage

```sql
-- Enhanced pose_data JSONB structure
-- Existing: pose_data jsonb default '{}'
-- Enhanced structure:
{
  "source": "live_recording" | "uploaded_video",
  "metadata": {
    "totalFrames": number,
    "processedFrames": number,
    "averageConfidence": number,
    "processingTime": number,
    "frameRate": number
  },
  "poses": PoseDetectionResult[]
}
```

## Testing Strategy

### Unit Tests

1. **Video Processing Service Tests**
   ```typescript
   describe('VideoProcessingService', () => {
     it('should extract frames at correct intervals', async () => {
       // Test frame extraction timing
     });
     
     it('should generate consistent pose data format', async () => {
       // Test pose data format consistency
     });
     
     it('should handle memory constraints', async () => {
       // Test memory management
     });
   });
   ```

2. **Integration Tests**
   ```typescript
   describe('Video Source Detection', () => {
     it('should detect live recording videos', async () => {
       // Test detection of VisionCamera recordings
     });
     
     it('should detect uploaded videos', async () => {
       // Test detection of uploaded videos
     });
   });
   ```

### Performance Tests

1. **Processing Time Benchmarks**
   - 30s video: < 15s processing time
   - 60s video: < 30s processing time
   - Memory usage: < 100MB peak

2. **Accuracy Tests**
   - Compare pose detection accuracy between live and processed videos
   - Validate keypoint consistency across processing methods

## Deployment Considerations

### Dependencies

```json
{
  "react-native-video-processing": "^2.0.0",
  "react-native-fast-tflite": "^1.6.1",
  "react-native-worklets-core": "^1.0.0"
}
```

### Platform Support

- **iOS**: Full support with native video processing
- **Android**: Full support with native video processing  
- **Web**: Fallback to canvas-based frame extraction

### Performance Monitoring

```typescript
interface VideoProcessingMetrics {
  processingTime: number;
  memoryPeak: number;
  frameRate: number;
  accuracyScore: number;
  errorRate: number;
}

// Track metrics for performance optimization
analytics.track('video_processing_completed', metrics);
```

## Migration Plan

### Phase 1: Infrastructure (Week 1)
- [ ] Add react-native-video-processing dependency
- [ ] Implement basic frame extraction
- [ ] Create video processing service structure

### Phase 2: Core Processing (Week 2)
- [ ] Integrate MoveNet Lightning with extracted frames
- [ ] Implement pose data format consistency
- [ ] Add progress tracking and memory management

### Phase 3: Integration (Week 3)
- [ ] Integrate with existing analysis service
- [ ] Update database schema
- [ ] Add real-time progress updates

### Phase 4: Testing & Optimization (Week 4)
- [ ] Performance testing and optimization
- [ ] Error handling and edge cases
- [ ] Documentation and deployment

## Success Metrics

1. **Performance**: Video processing completes within 50% of video duration
2. **Accuracy**: Pose detection accuracy within 5% of live recording accuracy
3. **Memory**: Peak memory usage under 100MB during processing
4. **Reliability**: 99%+ success rate for supported video formats
5. **User Experience**: Real-time progress updates with smooth UI performance

## Risk Mitigation

1. **Memory Issues**: Implement frame pooling and batch processing
2. **Processing Time**: Optimize with background processing and caching
3. **Accuracy Variance**: Validate with test dataset and adjust confidence thresholds
4. **Platform Compatibility**: Provide web fallback implementation
5. **User Experience**: Ensure non-blocking UI with progress indicators
