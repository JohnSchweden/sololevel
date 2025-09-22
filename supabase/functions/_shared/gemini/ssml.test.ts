/**
 * Tests for Gemini SSML generation
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { generateSSMLFromStructuredFeedback } from './ssml.ts'

// Mock the Gemini dependencies
vi.mock('./config.ts', () => ({
  createValidatedGeminiConfig: vi.fn(),
}))

vi.mock('./generate.ts', () => ({
  generateTextOnlyContent: vi.fn(),
}))

vi.mock('../logger.ts', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}))

import { createValidatedGeminiConfig } from './config.ts'
import { generateTextOnlyContent } from './generate.ts'

describe('generateSSMLFromStructuredFeedback', () => {
  const mockConfig = {
    apiBase: 'https://generativelanguage.googleapis.com',
    apiKey: 'test-api-key',
    model: 'gemini-1.5-pro',
    ttsModel: 'gemini-2.5-flash-preview-tts',
    filesUploadUrl: 'https://generativelanguage.googleapis.com/upload/v1beta/files',
    generateUrl: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent',
    ttsGenerateUrl: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent',
    filesMaxMb: 20,
    analysisMode: 'real' as const,
    defaultVoiceName: 'Sadachbia'
  }

  const mockAnalysis = {
    textReport: 'Good squat performance with proper form',
    feedback: [
      {
        timestamp: 2.5,
        category: 'Posture' as const,
        message: 'Maintain proper posture throughout the movement',
        confidence: 0.85,
        impact: 0.8,
      },
      {
        timestamp: 7.8,
        category: 'Movement' as const,
        message: 'Focus on controlled eccentric phase',
        confidence: 0.9,
        impact: 0.7,
      },
    ],
    metrics: {
      posture: 85,
      movement: 90,
      overall: 87
    },
    confidence: 0.85,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createValidatedGeminiConfig).mockReturnValue(mockConfig)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should generate SSML successfully in real mode', async () => {
    const mockSSML = '<speak><prosody rate="medium">Analysis completed successfully.</prosody></speak>'
    const mockPrompt = 'Generate SSML markup for text-to-speech from the following exercise analysis feedback.'
    vi.mocked(generateTextOnlyContent).mockResolvedValue({
      text: mockSSML,
      rawResponse: { candidates: [{ content: { parts: [{ text: mockSSML }] } }] },
      prompt: mockPrompt
    })

    const result = await generateSSMLFromStructuredFeedback(mockAnalysis)

    expect(result.ssml).toBe(mockSSML)
    expect(result.prompt).toContain('Generate SSML markup for text-to-speech')
    expect(result.prompt).toContain('Requirements:')
    expect(result.prompt).toContain('Analysis Data:')
    expect(createValidatedGeminiConfig).toHaveBeenCalledTimes(1)
    expect(generateTextOnlyContent).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: expect.stringContaining('Generate SSML markup'),
        temperature: 0.3,
        maxOutputTokens: 1024,
      }),
      mockConfig
    )
  })

  it('should use fallback when API call fails', async () => {
    vi.mocked(generateTextOnlyContent).mockRejectedValue(new Error('API error'))

    const result = await generateSSMLFromStructuredFeedback(mockAnalysis)

    expect(result.ssml).toContain('<speak>')
    expect(result.ssml).toContain('</speak>')
    expect(result.ssml).toContain('Overall performance: 87')
    expect(result.prompt).toContain('Generate SSML markup')
  })

  it('should use fallback in mock mode', async () => {
    const mockConfigMock = { ...mockConfig, analysisMode: 'mock' as const }
    vi.mocked(createValidatedGeminiConfig).mockReturnValue(mockConfigMock)

    const result = await generateSSMLFromStructuredFeedback(mockAnalysis)

    expect(result.ssml).toContain('<speak>')
    expect(result.ssml).toContain('</speak>')
    expect(result.ssml).toContain('Overall performance: 87')
    expect(result.prompt).toBe('mock-mode-no-prompt')
    expect(generateTextOnlyContent).not.toHaveBeenCalled()
  })

  it('should use fallback when generated SSML is invalid', async () => {
    vi.mocked(generateTextOnlyContent).mockResolvedValue({
      text: 'Invalid SSML without speak tags',
      rawResponse: { candidates: [{ content: { parts: [{ text: 'Invalid SSML without speak tags' }] } }] },
      prompt: 'test prompt'
    })

    const result = await generateSSMLFromStructuredFeedback(mockAnalysis)

    expect(result.ssml).toContain('<speak>')
    expect(result.ssml).toContain('</speak>')
    expect(result.ssml).toContain('Overall performance: 87')
    expect(result.prompt).toContain('Generate SSML markup')
  })

  it('should handle empty feedback array', async () => {
    const mockConfigMock = { ...mockConfig, analysisMode: 'mock' as const }
    vi.mocked(createValidatedGeminiConfig).mockReturnValue(mockConfigMock)

    const analysisWithEmptyFeedback = {
      ...mockAnalysis,
      feedback: [],
    }

    const result = await generateSSMLFromStructuredFeedback(analysisWithEmptyFeedback)

    expect(result.ssml).toContain('<speak>')
    expect(result.ssml).toContain('</speak>')
    expect(result.prompt).toBe('mock-mode-no-prompt')
  })

  it('should handle missing metrics', async () => {
    const mockConfigMock = { ...mockConfig, analysisMode: 'mock' as const }
    vi.mocked(createValidatedGeminiConfig).mockReturnValue(mockConfigMock)

    const analysisWithoutMetrics = {
      ...mockAnalysis,
      metrics: undefined,
    }

    const result = await generateSSMLFromStructuredFeedback(analysisWithoutMetrics)

    expect(result.ssml).toContain('<speak>')
    expect(result.ssml).toContain('</speak>')
    expect(result.ssml).not.toContain('Overall performance:')
    expect(result.prompt).toBe('mock-mode-no-prompt')
  })

  it('should include voice options in fallback generation', async () => {
    vi.mocked(generateTextOnlyContent).mockRejectedValue(new Error('API error'))

    const result = await generateSSMLFromStructuredFeedback(mockAnalysis, {
      voice: 'female',
      speed: 'fast',
      emphasis: 'strong'
    })

    expect(result.ssml).toContain('<speak>')
    expect(result.ssml).toContain('</speak>')
    expect(result.prompt).toContain('Generate SSML markup')
  })

  it('should validate SSML structure correctly', async () => {
    // Valid SSML
    vi.mocked(generateTextOnlyContent).mockResolvedValueOnce({
      text: '<speak>Valid SSML</speak>',
      rawResponse: { candidates: [{ content: { parts: [{ text: '<speak>Valid SSML</speak>' }] } }] },
      prompt: 'test prompt'
    })

    let result = await generateSSMLFromStructuredFeedback(mockAnalysis)
    expect(result.ssml).toBe('<speak>Valid SSML</speak>')

    // Invalid SSML (missing closing tag)
    vi.mocked(generateTextOnlyContent).mockResolvedValueOnce({
      text: '<speak>Invalid SSML',
      rawResponse: { candidates: [{ content: { parts: [{ text: '<speak>Invalid SSML' }] } }] },
      prompt: 'test prompt'
    })

    result = await generateSSMLFromStructuredFeedback(mockAnalysis)
    expect(result.ssml).toContain('<speak>')
    expect(result.ssml).toContain('</speak>')
    expect(result.ssml).toContain('Overall performance: 87') // Fallback content
  })
})
