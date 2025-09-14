/**
 * Mock for @my/api package
 */

const mockCreateAnalysisJobWithPoseProcessing = jest.fn()
const mockUpdateAnalysisJobWithPoseData = jest.fn()

export const createAnalysisJobWithPoseProcessing = mockCreateAnalysisJobWithPoseProcessing
export const updateAnalysisJobWithPoseData = mockUpdateAnalysisJobWithPoseData

// Export the mock functions for use in tests
export const __mockCreateAnalysisJob = mockCreateAnalysisJobWithPoseProcessing
export const __mockUpdateAnalysisJob = mockUpdateAnalysisJobWithPoseData
