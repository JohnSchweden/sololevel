import {
  GeminiSSMLService,
  GeminiTTSService,
  MockSSMLService,
  MockTTSService,
} from '../../_shared/services/index.ts'
import { generateSSMLFromFeedback as geminiLLMFeedback } from '../gemini-ssml-feedback.ts'

type AnalysisMode = 'mock' | 'live'

function getAnalysisMode(): AnalysisMode {
  const mode = (globalThis as any).Deno?.env?.get('AI_ANALYSIS_MODE')?.toLowerCase()
  return mode === 'mock' ? 'mock' : 'live'
}

let cachedSSMLService: GeminiSSMLService | MockSSMLService | null = null
let cachedTTSService: GeminiTTSService | MockTTSService | null = null

export function getSSMLServiceForRuntime(): GeminiSSMLService | MockSSMLService {
  if (cachedSSMLService) {
    return cachedSSMLService
  }

  cachedSSMLService = getAnalysisMode() === 'mock'
    ? new MockSSMLService()
    : new GeminiSSMLService(geminiLLMFeedback)

  return cachedSSMLService
}

export function getTTSServiceForRuntime(): GeminiTTSService | MockTTSService {
  if (cachedTTSService) {
    return cachedTTSService
  }

  cachedTTSService = getAnalysisMode() === 'mock'
    ? new MockTTSService()
    : new GeminiTTSService()

  return cachedTTSService
}

export function resetServiceCaches(): void {
  cachedSSMLService = null
  cachedTTSService = null
}

