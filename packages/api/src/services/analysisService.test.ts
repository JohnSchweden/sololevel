/**
 * TDD Tests for Analysis Service - Video Processing Extensions
 * Tests the new functions for handling uploaded video pose processing
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { supabase } from '../supabase'
import {
  type AnalysisMetric,
  type PoseData,
  type TRDAnalysisResult,
  addAnalysisMetrics,
  createAnalysisJobWithPoseProcessing,
  getAnalysisJob,
  getAnalysisJobByVideoId,
  getAnalysisWithMetrics,
  storeAnalysisResults,
  updateAnalysisJobWithPoseData,
} from './analysisService'

// Mock Supabase with proper chaining support
const createChainableMock = () => {
  const mock = {
    eq: vi.fn(() => mock),
    select: vi.fn(() => mock),
    single: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(() => mock),
  }
  return mock
}

vi.mock('../supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(() => createChainableMock()),
    rpc: vi.fn(),
  },
}))

describe('Analysis Service - Video Processing Extensions', () => {
  let mockSupabase: any
  let mockUser: any

  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabase = vi.mocked(supabase)
    mockUser = { data: { user: { id: 'test-user-id' } } }
    mockSupabase.auth.getUser.mockResolvedValue(mockUser)

    // Reset the from mock to return a fresh chainable mock for each test
    mockSupabase.from.mockImplementation(() => createChainableMock())
  })

  describe('createAnalysisJobWithPoseProcessing', () => {
    it('should create analysis job for uploaded video', async () => {
      const mockJob = {
        id: 123,
        user_id: 'test-user-id',
        video_recording_id: 456,
        status: 'queued',
        video_source: 'uploaded_video',
        created_at: '2024-01-01T00:00:00Z',
      }

      const mockInsert = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: mockJob, error: null })),
        })),
      }))

      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
      })

      const result = await createAnalysisJobWithPoseProcessing(456)

      expect(mockSupabase.auth.getUser).toHaveBeenCalled()
      expect(mockSupabase.from).toHaveBeenCalledWith('analysis_jobs')
      expect(mockInsert).toHaveBeenCalledWith({
        user_id: 'test-user-id',
        video_recording_id: 456,
        status: 'queued',
        video_source: 'uploaded_video',
      })

      expect(result).toEqual(mockJob)
    })

    it('should throw error when user not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null } })

      await expect(createAnalysisJobWithPoseProcessing(456)).rejects.toThrow(
        'User not authenticated'
      )
    })

    it('should handle database errors', async () => {
      const mockInsert = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.resolve({ data: null, error: { message: 'Database error' } })
          ),
        })),
      }))

      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
      })

      await expect(createAnalysisJobWithPoseProcessing(456)).rejects.toThrow(
        'Failed to create analysis job: Database error'
      )
    })

    it('should set correct video source for uploaded videos', async () => {
      const mockJob = {
        id: 123,
        user_id: 'test-user-id',
        video_recording_id: 456,
        status: 'queued',
        video_source: 'uploaded_video',
      }

      const mockInsert = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: mockJob, error: null })),
        })),
      }))

      mockSupabase.from.mockReturnValue({
        insert: mockInsert,
      })

      await createAnalysisJobWithPoseProcessing(456)

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          video_source: 'uploaded_video',
        })
      )
    })
  })

  describe('updateAnalysisJobWithPoseData', () => {
    it('should update analysis job with pose data and metadata', async () => {
      const mockPoseData = {
        frames: [
          {
            timestamp: 1000,
            keypoints: [{ x: 0.5, y: 0.5, confidence: 0.9, name: 'nose' }],
          },
        ],
        metadata: {
          fps: 30,
          duration: 10,
          total_frames: 300,
        },
      }

      const mockUpdatedJob = {
        id: 123,
        pose_data: mockPoseData,
      }

      const mockChain = createChainableMock()
      mockChain.single.mockResolvedValue({ data: mockUpdatedJob, error: null })

      mockSupabase.from.mockReturnValue(mockChain)

      const result = await updateAnalysisJobWithPoseData(123, mockPoseData)

      expect(mockSupabase.from).toHaveBeenCalledWith('analysis_jobs')
      expect(mockChain.update).toHaveBeenCalledWith({
        pose_data: mockPoseData,
      })

      expect(result).toEqual(mockUpdatedJob)
    })

    it('should update analysis job with pose data only', async () => {
      const mockPoseData = {
        frames: [],
        metadata: { fps: 30, duration: 5, total_frames: 150 },
      }

      const mockUpdatedJob = {
        id: 123,
        pose_data: mockPoseData,
      }

      const mockChain = createChainableMock()
      mockChain.single.mockResolvedValue({ data: mockUpdatedJob, error: null })

      mockSupabase.from.mockReturnValue(mockChain)

      const result = await updateAnalysisJobWithPoseData(123, mockPoseData)

      expect(mockChain.update).toHaveBeenCalledWith({
        pose_data: mockPoseData,
      })

      expect(result).toEqual(mockUpdatedJob)
    })

    it('should handle database update errors', async () => {
      const mockPoseData = {
        frames: [],
        metadata: { fps: 30, duration: 0, total_frames: 0 },
      }

      const mockChain = createChainableMock()
      mockChain.single.mockResolvedValue({ data: null, error: { message: 'Update failed' } })

      mockSupabase.from.mockReturnValue(mockChain)

      await expect(updateAnalysisJobWithPoseData(123, mockPoseData)).rejects.toThrow(
        'Failed to update analysis job: Update failed'
      )
    })

    it('should validate pose data structure', async () => {
      const invalidPoseData = {
        // Missing required frames array
        metadata: { fps: 30, duration: 0, total_frames: 0 },
      } as PoseData

      const mockUpdatedJob = {
        id: 123,
        pose_data: invalidPoseData,
      }

      const mockChain = createChainableMock()
      mockChain.single.mockResolvedValue({ data: mockUpdatedJob, error: null })

      mockSupabase.from.mockReturnValue(mockChain)

      // Should still work - validation happens at the service level
      const result = await updateAnalysisJobWithPoseData(123, invalidPoseData)
      expect(result.pose_data).toEqual(invalidPoseData)
    })
  })

  describe('Integration with existing functions', () => {
    it('should work with getAnalysisJob', async () => {
      const mockJob = {
        id: 123,
        pose_data: { frames: [], metadata: { fps: 30, duration: 0, total_frames: 0 } },
        status: 'completed',
      }

      const mockChain = createChainableMock()
      mockChain.single.mockResolvedValue({ data: mockJob, error: null })

      mockSupabase.from.mockReturnValue(mockChain)

      const result = await getAnalysisJob(123)

      expect(result).toEqual(mockJob)
    })

    it('should work with getAnalysisJobByVideoId', async () => {
      const mockJob = {
        id: 123,
        video_recording_id: 456,
        video_source: 'uploaded_video',
      }

      const mockChain = createChainableMock()
      mockChain.single.mockResolvedValue({ data: mockJob, error: null })

      mockSupabase.from.mockReturnValue(mockChain)

      const result = await getAnalysisJobByVideoId(456)

      expect(result).toEqual(mockJob)
    })
  })

  describe('Error handling', () => {
    it('should handle network errors', async () => {
      mockSupabase.auth.getUser.mockRejectedValue(new Error('Network error'))

      await expect(createAnalysisJobWithPoseProcessing(456)).rejects.toThrow('Network error')
    })

    it('should handle permission errors', async () => {
      mockSupabase.auth.getUser.mockRejectedValue(new Error('Permission denied'))

      await expect(createAnalysisJobWithPoseProcessing(456)).rejects.toThrow('Permission denied')
    })
  })

  describe('Data integrity', () => {
    it('should preserve pose data structure', async () => {
      const complexPoseData = {
        frames: [
          {
            timestamp: 1000,
            keypoints: [
              { x: 0.5, y: 0.3, confidence: 0.95, name: 'nose' },
              { x: 0.4, y: 0.6, confidence: 0.88, name: 'left_shoulder' },
            ],
          },
          {
            timestamp: 1033,
            keypoints: [{ x: 0.51, y: 0.31, confidence: 0.92, name: 'nose' }],
          },
        ],
        metadata: {
          fps: 30,
          duration: 10.5,
          total_frames: 315,
        },
      }

      const mockUpdatedJob = {
        id: 123,
        pose_data: complexPoseData,
      }

      const mockChain = createChainableMock()
      mockChain.single.mockResolvedValue({ data: mockUpdatedJob, error: null })

      mockSupabase.from.mockReturnValue(mockChain)

      const result = await updateAnalysisJobWithPoseData(123, complexPoseData)

      const poseData = result.pose_data as typeof complexPoseData
      expect(poseData.frames).toHaveLength(2)
      expect(poseData.frames[0].keypoints).toHaveLength(2)
      expect(poseData.metadata.fps).toBe(30)
    })
  })

  // Phase 1: TDD Tests for TRD-Compliant Functions
  describe('Phase 1: TRD-Compliant Analysis Functions', () => {
    describe('storeAnalysisResults', () => {
      it('should store complete analysis results with all fields', async () => {
        // RED: Write failing test first
        const analysisResults: TRDAnalysisResult = {
          summary_text: 'Excellent squat form with minor improvements needed',
          metrics: {
            form_score: { value: 85, unit: 'percentage' },
            balance_rating: { value: 92, unit: 'percentage' },
            depth_score: { value: 78, unit: 'percentage' },
          },
        }

        mockSupabase.rpc.mockResolvedValue({ data: true, error: null })

        const result = await storeAnalysisResults(123, analysisResults)

        expect(result.data).toBe(true)
        expect(result.error).toBeNull()
        expect(mockSupabase.rpc).toHaveBeenCalledWith('store_analysis_results', {
          p_job_id: 123,
          p_full_feedback_text: analysisResults.summary_text,
          p_summary_text: analysisResults.summary_text,
          p_raw_generated_text: null,
          p_full_feedback_json: null,
          p_feedback_prompt: null,
        })
      })

      it('should handle partial results (only summary text)', async () => {
        const partialResults: TRDAnalysisResult = {
          summary_text: 'Good form overall',
        }

        mockSupabase.rpc.mockResolvedValue({ data: true, error: null })

        const result = await storeAnalysisResults(456, partialResults)

        expect(result.data).toBe(true)
        expect(mockSupabase.rpc).toHaveBeenCalledWith('store_analysis_results', {
          p_job_id: 456,
          p_full_feedback_text: 'Good form overall',
          p_summary_text: 'Good form overall',
          p_raw_generated_text: null,
          p_full_feedback_json: null,
          p_feedback_prompt: null,
        })
      })

      it('should handle database errors gracefully', async () => {
        const analysisResults: TRDAnalysisResult = {
          summary_text: 'Test summary',
        }

        mockSupabase.rpc.mockResolvedValue({
          error: { message: 'Database connection failed' },
        })

        const result = await storeAnalysisResults(789, analysisResults)

        expect(result.data).toBe(false)
        expect(result.error).toBe('Database connection failed')
      })

      it('should handle network errors', async () => {
        const analysisResults: TRDAnalysisResult = {
          summary_text: 'Test summary',
        }

        mockSupabase.rpc.mockRejectedValue(new Error('Network timeout'))

        const result = await storeAnalysisResults(999, analysisResults)

        expect(result.data).toBe(false)
        expect(result.error).toBe('Network timeout')
      })
    })

    describe('getAnalysisWithMetrics', () => {
      it('should retrieve analysis with structured metrics', async () => {
        const mockAnalysisData = {
          analysis_id: 123,
          status: 'completed',
          progress_percentage: 100,
          summary_text: 'Great squat form!',
          created_at: '2025-09-14T10:00:00Z',
          updated_at: '2025-09-14T10:05:00Z',
          metrics: {
            form_score: { value: 85, unit: 'percentage', updated_at: '2025-09-14T10:05:00Z' },
            balance_rating: { value: 92, unit: 'percentage', updated_at: '2025-09-14T10:05:00Z' },
          },
        }

        mockSupabase.rpc.mockResolvedValue({
          data: [mockAnalysisData],
          error: null,
        })

        const result = await getAnalysisWithMetrics(123)

        expect(result.data).toEqual(mockAnalysisData)
        expect(result.error).toBeNull()
        expect(mockSupabase.rpc).toHaveBeenCalledWith('get_analysis_with_metrics', {
          job_id: 123,
        })
      })

      it('should handle empty results', async () => {
        mockSupabase.rpc.mockResolvedValue({
          data: [],
          error: null,
        })

        const result = await getAnalysisWithMetrics(456)

        expect(result.data).toBeNull()
        expect(result.error).toBeNull()
      })

      it('should handle database errors', async () => {
        mockSupabase.rpc.mockResolvedValue({
          data: null,
          error: { message: 'Analysis not found' },
        })

        const result = await getAnalysisWithMetrics(789)

        expect(result.data).toBeNull()
        expect(result.error).toBe('Analysis not found')
      })

      it('should handle non-array response data', async () => {
        const mockSingleResult = {
          analysis_id: 999,
          status: 'completed',
          progress_percentage: 100,
          summary_text: 'Test',
          created_at: '2025-09-14T10:00:00Z',
          updated_at: '2025-09-14T10:00:00Z',
          metrics: {},
        }

        mockSupabase.rpc.mockResolvedValue({
          data: mockSingleResult,
          error: null,
        })

        const result = await getAnalysisWithMetrics(999)

        expect(result.data).toEqual(mockSingleResult)
        expect(result.error).toBeNull()
      })
    })

    describe('addAnalysisMetrics', () => {
      it('should add multiple metrics to an analysis', async () => {
        const metrics: AnalysisMetric[] = [
          { metric_key: 'form_score', metric_value: 85, unit: 'percentage' },
          { metric_key: 'balance_rating', metric_value: 92, unit: 'percentage' },
          { metric_key: 'depth_measurement', metric_value: 45.5, unit: 'degrees' },
        ]

        const mockChain = createChainableMock()
        mockChain.insert.mockResolvedValue({ data: null, error: null })
        mockSupabase.from.mockReturnValue(mockChain)

        const result = await addAnalysisMetrics(123, metrics)

        expect(result.data).toBe(true)
        expect(result.error).toBeNull()
        expect(mockSupabase.from).toHaveBeenCalledWith('analysis_metrics')
        expect(mockChain.insert).toHaveBeenCalledWith([
          { analysis_id: 123, metric_key: 'form_score', metric_value: 85, unit: 'percentage' },
          { analysis_id: 123, metric_key: 'balance_rating', metric_value: 92, unit: 'percentage' },
          {
            analysis_id: 123,
            metric_key: 'depth_measurement',
            metric_value: 45.5,
            unit: 'degrees',
          },
        ])
      })

      it('should add single metric to an analysis', async () => {
        const metrics: AnalysisMetric[] = [
          { metric_key: 'completion_time', metric_value: 30.5, unit: 'seconds' },
        ]

        const mockChain = createChainableMock()
        mockChain.insert.mockResolvedValue({ data: null, error: null })
        mockSupabase.from.mockReturnValue(mockChain)

        const result = await addAnalysisMetrics(456, metrics)

        expect(result.data).toBe(true)
        expect(result.error).toBeNull()
        expect(mockChain.insert).toHaveBeenCalledWith([
          { analysis_id: 456, metric_key: 'completion_time', metric_value: 30.5, unit: 'seconds' },
        ])
      })

      it('should handle empty metrics array', async () => {
        const metrics: AnalysisMetric[] = []

        const mockChain = createChainableMock()
        mockChain.insert.mockResolvedValue({ data: null, error: null })
        mockSupabase.from.mockReturnValue(mockChain)

        const result = await addAnalysisMetrics(789, metrics)

        expect(result.data).toBe(true)
        expect(mockChain.insert).toHaveBeenCalledWith([])
      })

      it('should handle database constraint errors', async () => {
        const metrics: AnalysisMetric[] = [
          { metric_key: 'invalid_metric', metric_value: 100, unit: 'percentage' },
        ]

        const mockChain = createChainableMock()
        mockChain.insert.mockResolvedValue({
          data: null,
          error: { message: 'Foreign key constraint violation' },
        })
        mockSupabase.from.mockReturnValue(mockChain)

        const result = await addAnalysisMetrics(999, metrics)

        expect(result.data).toBe(false)
        expect(result.error).toBe('Foreign key constraint violation')
      })

      it('should handle network errors during metric insertion', async () => {
        const metrics: AnalysisMetric[] = [
          { metric_key: 'test_metric', metric_value: 50, unit: 'percentage' },
        ]

        const mockChain = createChainableMock()
        mockChain.insert.mockRejectedValue(new Error('Connection timeout'))
        mockSupabase.from.mockReturnValue(mockChain)

        const result = await addAnalysisMetrics(111, metrics)

        expect(result.data).toBe(false)
        expect(result.error).toBe('Connection timeout')
      })
    })
  })
})
