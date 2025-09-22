/**
 * AI Services Index
 * Centralized exports for all AI processing services
 */

// Video Analysis Services
export type {
  IVideoAnalysisService,
  VideoAnalysisContext,
  VideoAnalysisResult,
} from './video/VideoAnalysisService.ts'

export {
  GeminiVideoAnalysisService,
  MockVideoAnalysisService,
} from './video/VideoAnalysisService.ts'

// Speech Services
export type {
  ISSMLService,
  SSMLContext,
  SSMLResult,
} from './speech/SSMLService.ts'

export {
  GeminiSSMLService,
  MockSSMLService,
} from './speech/SSMLService.ts'

export type {
  ITTSService,
  TTSContext,
  TTSResult,
} from './speech/TTSService.ts'

export {
  GeminiTTSService,
  MockTTSService,
} from './speech/TTSService.ts'
