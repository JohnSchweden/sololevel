# @sololevel/prompts-edge

Edge-safe prompts package for Supabase Edge Functions. This package provides Deno-compatible prompt management for AI analysis without Node.js dependencies.

## Installation

```bash
# Via JSR (recommended for production)
import { getGeminiAnalysisPrompt, getQwenAnalysisPrompt, getSSMLGenerationPrompt } from 'jsr:@sololevel/prompts-edge@1'

# Via npm/yarn (not recommended for Edge Functions)
npm install @sololevel/prompts-edge
```

## Usage

```typescript
import {
  getGeminiAnalysisPrompt,
  getQwenAnalysisPrompt,
  getSSMLGenerationPrompt,
  EdgePromptManager
} from 'jsr:@sololevel/prompts-edge@1'

// Generate Gemini analysis prompt with custom parameters
const geminiPrompt = getGeminiAnalysisPrompt({
  duration: 45,
  feedback_count: 5,
  start_time: 10,
  end_time: 35
})

// Generate Qwen analysis prompt
const qwenPrompt = getQwenAnalysisPrompt({
  duration: 30,
  target_timestamps: [8, 18, 28]
})

// Generate SSML for text-to-speech
const ssml = getSSMLGenerationPrompt({
  feedback_text: "Great job maintaining proper form!",
  system_instruction: "Use a confident, encouraging tone"
})

// Use the prompt manager for basic prompts
const manager = new EdgePromptManager()
const basicPrompt = manager.getPrompt('videoAnalysis')
```

## API

### Analysis Prompts

- `getGeminiAnalysisPrompt(params?: GeminiAnalysisParams): string` - Generate Gemini video analysis prompt
- `getQwenAnalysisPrompt(params?: QwenAnalysisParams): string` - Generate Qwen video analysis prompt
- `getVideoAnalysisPrompt(params?: GeminiAnalysisParams): string` - Generic video analysis prompt (uses Gemini)

### SSML Generation

- `getSSMLGenerationPrompt(params: SSMLGenerationParams): string` - Generate SSML prompt for TTS
- `getSSMLTemplate(params: SSMLGenerationParams): string` - Alternative SSML generation method

### Prompt Manager

- `EdgePromptManager` - Simple prompt storage and retrieval
- `getPrompt(key: string): string` - Get a prompt by key
- `hasPrompt(key: string): boolean` - Check if a prompt exists
- `getAvailablePrompts(): string[]` - Get all available prompt keys

### Types

- `PromptItem` - Structure for feedback items
- `VideoAnalysisResult` - Structure for analysis results
- `GeminiAnalysisParams` - Parameters for Gemini prompt generation
- `QwenAnalysisParams` - Parameters for Qwen prompt generation
- `SSMLGenerationParams` - Parameters for SSML generation

## Templates Included

### Analysis Templates
- **GEMINI_ANALYSIS_PROMPT_TEMPLATE**: Comprehensive video analysis with structured feedback format
- **QWEN_ANALYSIS_PROMPT_TEMPLATE**: Presentation-focused analysis template

### SSML Templates
- **SSML_SYSTEM_INSTRUCTION**: Sarcastic comedian persona
- **SSML_GENERATION_TEMPLATE**: TTS markup generation template

## Publishing

To publish this package to JSR:

1. Create a JSR account at https://jsr.io/
2. Authenticate: `deno publish --login`
3. Publish: `deno publish` (from this directory)

## Development

```bash
# Dry run to check for issues
deno publish --dry-run

# Publish with dirty working directory
deno publish --allow-dirty
```

## Migration from Original

This package includes all prompts originally from:
- `@my/api/src/prompts/analysis.ts` - Gemini and Qwen analysis prompts
- `@my/api/src/prompts/ssml.ts` - SSML generation prompts

The Edge Functions can now import these directly without Node.js dependencies.

## License

MIT
