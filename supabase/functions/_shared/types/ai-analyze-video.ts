// Types for video processing and analysis

import type { VoiceConfigPromptParams } from './voice-config.ts'

export interface VideoProcessingRequest {
  // Either videoPath (legacy) or videoRecordingId (new) must be provided
  videoPath?: string
  videoRecordingId?: number
  // userId is now extracted from JWT token, not from request body
  videoSource?: 'live_recording' | 'uploaded_video'
  frameData?: string[] // Base64 encoded frames for uploaded videos
  existingPoseData?: PoseDetectionResult[] // For live recordings
  // Timing parameters for AI analysis
  startTime?: number
  endTime?: number
  duration?: number
  feedbackCount?: number
  targetTimestamps?: number[]
  minGap?: number
  firstTimestamp?: number
  // Pipeline stage control
  stages?: {
    runVideoAnalysis?: boolean
    runLLMFeedback?: boolean
    runSSML?: boolean
    runTTS?: boolean
  }
}

export interface VideoAnalysisParams {
  startTime?: number
  endTime?: number
  duration?: number
  feedbackCount?: number
  targetTimestamps?: number[]
  minGap?: number
  firstTimestamp?: number
  /** Optional voice configuration for dynamic prompt injection */
  voiceConfig?: VoiceConfigPromptParams
}

export interface PoseDetectionResult {
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

export interface Joint {
  id: string
  x: number
  y: number
  confidence: number
  connections: string[]
}

export interface AnalysisJob {
  id: number
  user_id: string
  video_recording_id: number
  status: 'queued' | 'processing' | 'completed' | 'failed'
  progress_percentage: number
  processing_started_at?: string
  processing_completed_at?: string
  error_message?: string
  results: Record<string, unknown>
  pose_data: PoseDetectionResult[] | Record<string, unknown>
}

// Request parsing and validation
export function parseVideoProcessingRequest(body: unknown): VideoProcessingRequest {
  if (!body || typeof body !== 'object') {
    throw new Error('Request body is required')
  }

  const data = body as Record<string, unknown>

  // Either videoPath or videoRecordingId must be provided
  const hasVideoPath = data.videoPath && typeof data.videoPath === 'string'
  const hasVideoRecordingId = data.videoRecordingId && typeof data.videoRecordingId === 'number'

  if (!hasVideoPath && !hasVideoRecordingId) {
    throw new Error('Either videoPath or videoRecordingId must be provided')
  }

  const request: VideoProcessingRequest = {}

  // Add videoPath or videoRecordingId
  if (hasVideoPath) {
    request.videoPath = data.videoPath as string
  }
  if (hasVideoRecordingId) {
    request.videoRecordingId = data.videoRecordingId as number
  }

  // Optional fields with validation
  if (data.videoSource && typeof data.videoSource === 'string') {
    if (data.videoSource === 'live_recording' || data.videoSource === 'uploaded_video') {
      request.videoSource = data.videoSource
    }
  }

  if (data.frameData && Array.isArray(data.frameData)) {
    request.frameData = data.frameData.filter(item => typeof item === 'string')
  }

  if (data.existingPoseData && Array.isArray(data.existingPoseData)) {
    request.existingPoseData = data.existingPoseData as PoseDetectionResult[]
  }

  // Timing parameters
  if (typeof data.startTime === 'number') request.startTime = data.startTime
  if (typeof data.endTime === 'number') request.endTime = data.endTime
  if (typeof data.duration === 'number') request.duration = data.duration
  if (typeof data.feedbackCount === 'number') request.feedbackCount = data.feedbackCount
  if (typeof data.minGap === 'number') request.minGap = data.minGap
  if (typeof data.firstTimestamp === 'number') request.firstTimestamp = data.firstTimestamp

  if (data.targetTimestamps && Array.isArray(data.targetTimestamps)) {
    request.targetTimestamps = data.targetTimestamps.filter(item => typeof item === 'number')
  }

  // Pipeline stages control
  if (data.stages && typeof data.stages === 'object') {
    const stages = data.stages as Record<string, unknown>
    request.stages = {}

    if (typeof stages.runVideoAnalysis === 'boolean') request.stages.runVideoAnalysis = stages.runVideoAnalysis
    if (typeof stages.runLLMFeedback === 'boolean') request.stages.runLLMFeedback = stages.runLLMFeedback
    if (typeof stages.runSSML === 'boolean') request.stages.runSSML = stages.runSSML
    if (typeof stages.runTTS === 'boolean') request.stages.runTTS = stages.runTTS
  }

  return request
}
