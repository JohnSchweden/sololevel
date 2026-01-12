import {
  GeminiSSMLService,
  GeminiTTSService,
  MockSSMLService,
  MockTTSService,
} from '../../_shared/services/index.ts'
import { generateSSMLFromFeedback as geminiLLMFeedback } from '../gemini-ssml-feedback.ts'

/**
 * Check if mock services should be used (bypasses real pipeline entirely)
 * Use AI_ANALYSIS_MOCK_SERVICES to control service selection
 * Use AI_ANALYSIS_MODE to control mock responses inside real services
 */
function useMockServices(): boolean {
  const mockServices = (globalThis as any).Deno?.env?.get('AI_ANALYSIS_MOCK_SERVICES')
  return mockServices === 'true'
}

let cachedSSMLService: GeminiSSMLService | MockSSMLService | null = null
let cachedTTSService: GeminiTTSService | MockTTSService | null = null

export function getSSMLServiceForRuntime(): GeminiSSMLService | MockSSMLService {
  if (cachedSSMLService) {
    return cachedSSMLService
  }

  cachedSSMLService = useMockServices()
    ? new MockSSMLService()
    : new GeminiSSMLService(geminiLLMFeedback)

  return cachedSSMLService
}

export function getTTSServiceForRuntime(): GeminiTTSService | MockTTSService {
  if (cachedTTSService) {
    return cachedTTSService
  }

  cachedTTSService = useMockServices()
    ? new MockTTSService()
    : new GeminiTTSService()

  return cachedTTSService
}

export function resetServiceCaches(): void {
  cachedSSMLService = null
  cachedTTSService = null
}

