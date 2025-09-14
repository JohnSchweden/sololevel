// Client-Side Pose Integration Strategy
// This approach leverages the existing MVP pose detection infrastructure
// and processes pose data on the client before sending to Edge Function

// Types matching the Edge Function interface
interface Joint {
  id: string
  x: number
  y: number
  confidence: number
  connections: string[]
}

interface PoseDetectionResult {
  timestamp: number
  joints: Joint[]
  confidence: number
  metadata?: {
    source: 'live_recording' | 'uploaded_video'
    processingMethod: 'vision_camera' | 'video_processing'
    frameIndex?: number
    originalTimestamp?: number
  }
}

/**
 * Client-Side Pose Processing Strategy
 *
 * This approach leverages existing infrastructure with clear separation of concerns:
 *
 * 1. Client extracts video frames using react-native-video-processing
 * 2. Client runs pose detection using existing useMVPPoseDetection hooks
 * 3. Client saves pose data to database in same format as live recording
 * 4. Pose data stored for UI purposes only (overlays, visualization, future use)
 * 5. Edge Function performs AI analysis on video content directly (no pose data)
 * 6. Edge Function focuses on AI analysis (Gemini 2.5, LLM, TTS)
 *
 * Benefits:
 * - Clean separation: Pose data (UI) ≠ AI analysis (video content)
 * - Unified data flow: same pose data storage as live recording
 * - Leverages existing TensorFlow Lite models in apps/expo/assets/models/
 * - Uses existing cross-platform pose detection infrastructure
 * - Reduces Edge Function complexity (no pose processing)
 * - Better performance (native TFLite vs server-side TensorFlow.js)
 * - Consistent with existing live recording pose detection
 * - Pose data persists for UI display, overlays, analysis visualization
 */

/**
 * Convert MVP pose detection result to Edge Function format
 */
export function convertMVPPoseToEdgeFormat(
  mvpPose: any, // MVPPoseDetectionResult from existing infrastructure
  frameIndex: number,
  videoSource: 'live_recording' | 'uploaded_video' = 'uploaded_video'
): PoseDetectionResult {
  // Convert MVP keypoints to Edge Function joints format
  const joints: Joint[] = mvpPose.keypoints.map((kp: any) => ({
    id: kp.name || kp.id,
    x: kp.x,
    y: kp.y,
    confidence: kp.confidence,
    connections: [], // Would be computed from pose connections if needed
  }))

  return {
    timestamp: mvpPose.timestamp,
    joints,
    confidence: mvpPose.confidence,
    metadata: {
      source: videoSource,
      processingMethod: videoSource === 'live_recording' ? 'vision_camera' : 'video_processing',
      frameIndex,
      originalTimestamp: mvpPose.timestamp,
    },
  }
}

/**
 * Process video frames using existing client-side infrastructure
 * This function would be called from the client app to save pose data to database
 */
export async function processVideoFramesOnClient(
  _videoPath: string,
  _analysisId: number, // The analysis job ID to save pose data to
  _frameExtractionOptions: {
    frameRate?: number
    quality?: 'low' | 'medium' | 'high'
  } = {}
): Promise<{
  frames: string[] // base64 encoded frames
  success: boolean // whether pose data was saved to database
}> {
  // This is a conceptual implementation - actual implementation would be in client app
  // using react-native-video-processing and existing useMVPPoseDetection hooks

  const frames: string[] = []

  // 1. Extract frames using react-native-video-processing (client-side)
  // const extractedFrames = await VideoProcessing.extractFrames(videoPath, frameExtractionOptions)

  // 2. Run pose detection on each frame using existing MVP infrastructure (client-side)
  // for (let i = 0; i < extractedFrames.length; i++) {
  //   const frame = extractedFrames[i]
  //   const mvpPose = await runMVPPoseDetection(frame) // existing hook
  //   const edgePose = convertMVPPoseToEdgeFormat(mvpPose, i, 'uploaded_video')
  //
  //   frames.push(frame)
  //   poseData.push(edgePose)
  // }

  // 3. Save pose data to database in same format as live recording
  // const poseDataWithMetadata = {
  //   source: 'uploaded_video',
  //   metadata: {
  //     totalFrames: poseData.length,
  //     processedFrames: poseData.length,
  //     averageConfidence: calculateAverageConfidence(poseData),
  //     processingTime: Date.now() - startTime,
  //     frameRate: 30
  //   },
  //   poses: poseData
  // }
  //
  // await supabase
  //   .from('analysis_jobs')
  //   .update({ pose_data: poseDataWithMetadata })
  //   .eq('id', analysisId)

  return {
    frames,
    success: true, // In real implementation, return actual success status
  }
}

/**
 * Recommended client-side workflow for uploaded video analysis:
 *
 * 1. User uploads video and creates analysis job
 * 2. Client extracts frames using react-native-video-processing
 * 3. Client runs pose detection using existing useMVPPoseDetection.native.ts
 * 4. Client saves pose data to database (same format as live recording)
 * 5. Pose data stored for UI purposes only (overlays, visualization)
 * 6. Client calls Edge Function with:
 *    - videoPath: for Gemini 2.5 video analysis
 *    - videoSource: 'uploaded_video'
 * 7. Edge Function analyzes video content directly (no pose data needed)
 * 8. Edge Function stores AI analysis results (summary, SSML, audio URL)
 *
 * This approach:
 * - Clean separation: Pose data (UI) ≠ AI analysis (video content)
 * - Unified data flow: pose data stored same way as live recording
 * - Reuses existing TensorFlow Lite models and infrastructure
 * - Maintains consistency with live recording pose detection
 * - Reduces server processing load and complexity
 * - Leverages native performance optimizations
 * - Pose data persists for UI display, overlays, analysis visualization
 */

/**
 * Mock implementation for Edge Function fallback
 * This generates consistent mock data when real pose detection isn't available
 */
export function generateMockPoseData(frameCount: number): PoseDetectionResult[] {
  const KEYPOINT_NAMES = [
    'nose',
    'left_eye',
    'right_eye',
    'left_ear',
    'right_ear',
    'left_shoulder',
    'right_shoulder',
    'left_elbow',
    'right_elbow',
    'left_wrist',
    'right_wrist',
    'left_hip',
    'right_hip',
    'left_knee',
    'right_knee',
    'left_ankle',
    'right_ankle',
  ]

  return Array.from({ length: frameCount }, (_, index) => ({
    timestamp: Date.now() + index * 33.33, // 30fps spacing
    joints: KEYPOINT_NAMES.map((name) => ({
      id: name,
      x: 0.3 + Math.sin(Date.now() * 0.001 + index) * 0.3, // Animated mock data
      y: 0.3 + Math.cos(Date.now() * 0.001 + index) * 0.3,
      confidence: 0.7 + Math.random() * 0.3,
      connections: [],
    })),
    confidence: 0.8,
    metadata: {
      source: 'uploaded_video',
      processingMethod: 'video_processing',
      frameIndex: index,
      originalTimestamp: Date.now() + index * 33.33,
    },
  }))
}
