/**
 * Mock for @my/api package
 */

const mockCreateAnalysisJobWithPoseProcessing = jest.fn()
const mockUpdateAnalysisJobWithPoseData = jest.fn()
const mockGetUserAnalysisJobs = jest.fn()
const mockGetAnalysisJob = jest.fn()

export const createAnalysisJobWithPoseProcessing = mockCreateAnalysisJobWithPoseProcessing
export const updateAnalysisJobWithPoseData = mockUpdateAnalysisJobWithPoseData
export const getUserAnalysisJobs = mockGetUserAnalysisJobs
export const getAnalysisJob = mockGetAnalysisJob

// Export the mock functions for use in tests
export const __mockCreateAnalysisJob = mockCreateAnalysisJobWithPoseProcessing
export const __mockUpdateAnalysisJob = mockUpdateAnalysisJobWithPoseData
export const __mockGetUserAnalysisJobs = mockGetUserAnalysisJobs
export const __mockGetAnalysisJob = mockGetAnalysisJob
