/**
 * Unit tests for prompts-local module
 * Tests buildPromptFromConfig with all voice/mode combinations
 */

import { assertEquals, assertStringIncludes } from 'https://deno.land/std@0.208.0/assert/mod.ts'
import type { VoiceConfigPromptParams } from '../_shared/types/voice-config.ts'
import { buildPromptFromConfig } from './prompts-local.ts'

// Test configs matching seed data from coach_voice_configs migration
const ROAST_CONFIG: VoiceConfigPromptParams = {
  promptVoice: '"Roast me!!!" Use playful insults and biting humour (Brutal, memorable, transformative).',
  promptPersonality: 'Ruthless/Sharp Insight with north european wit',
  ssmlSystemInstruction: 'You are a professional, sarcastic comedian with a sharp wit and a laid-back, confident russian accent.\n\n**Your task:**\n1. Use the text exactly as provided.\n2. Add SSML markup that enhances the delivery with:\n   - Appropriate pauses <break> for comedic timing,\n   - Emphasis <emphasis> on key roast words,\n   - Prosody <prosody> adjustments for sarcasm and speed.',
}

const ZEN_CONFIG: VoiceConfigPromptParams = {
  promptVoice: 'Zen me. Calm, mindful coaching. Guide with patience and understanding. Acknowledge effort before suggesting improvements.',
  promptPersonality: 'Peaceful/Supportive Guide with gentle british composure',
  ssmlSystemInstruction: 'You are a calm meditation guide with a peaceful, measured presence.\n\n**Your task:**\n1. Use the text exactly as provided.\n2. Add SSML markup that enhances the delivery with:\n   - Gentle <break> pauses between thoughts for measured pacing,\n   - Soft <emphasis> on calming words,\n   - Steady <prosody> adjustments for peaceful delivery.',
}

const LOVEBOMB_CONFIG: VoiceConfigPromptParams = {
  promptVoice: 'Lovebomb me. Use warm and lovable positivity celebrating every win (memorable, transformative).',
  promptPersonality: 'Admirable Parent with warm and lovable positivity with musical lilt',
  ssmlSystemInstruction: 'You are an enthusiastic supportive parent with warm, encouraging energy.\n\n**Your task:**\n1. Use the text exactly as provided.\n2. Add SSML markup that enhances the delivery with:\n   - Brief <break> pauses for celebratory impact,\n   - Strong <emphasis> on positive words,\n   - Excited <prosody> adjustments for warm enthusiasm.',
}

Deno.test('buildPromptFromConfig - Roast mode', () => {
  // Arrange
  const duration = 6.3

  // Act
  const result = buildPromptFromConfig(ROAST_CONFIG, duration)

  // Assert
  assertStringIncludes(result, ROAST_CONFIG.promptPersonality)
  assertStringIncludes(result, ROAST_CONFIG.promptVoice)
  assertStringIncludes(result, '6.3s')
  
  // Verify no placeholders remain
  assertEquals(result.includes('{PERSONALITY}'), false, 'Should not contain {PERSONALITY} placeholder')
  assertEquals(result.includes('{VOICE}'), false, 'Should not contain {VOICE} placeholder')
  assertEquals(result.includes('{DURATION}'), false, 'Should not contain {DURATION} placeholder')
})

Deno.test('buildPromptFromConfig - Zen mode', () => {
  // Arrange
  const duration = 10.5

  // Act
  const result = buildPromptFromConfig(ZEN_CONFIG, duration)

  // Assert
  assertStringIncludes(result, ZEN_CONFIG.promptPersonality)
  assertStringIncludes(result, ZEN_CONFIG.promptVoice)
  assertStringIncludes(result, '10.5s')
  
  // Verify no placeholders remain
  assertEquals(result.includes('{PERSONALITY}'), false)
  assertEquals(result.includes('{VOICE}'), false)
  assertEquals(result.includes('{DURATION}'), false)
})

Deno.test('buildPromptFromConfig - Lovebomb mode', () => {
  // Arrange
  const duration = 8.0

  // Act
  const result = buildPromptFromConfig(LOVEBOMB_CONFIG, duration)

  // Assert
  assertStringIncludes(result, LOVEBOMB_CONFIG.promptPersonality)
  assertStringIncludes(result, LOVEBOMB_CONFIG.promptVoice)
  assertStringIncludes(result, '8s')
  
  // Verify no placeholders remain
  assertEquals(result.includes('{PERSONALITY}'), false)
  assertEquals(result.includes('{VOICE}'), false)
  assertEquals(result.includes('{DURATION}'), false)
})

Deno.test('buildPromptFromConfig - Preserves structural elements', () => {
  // Arrange
  const duration = 6.3

  // Act
  const result = buildPromptFromConfig(ROAST_CONFIG, duration)

  // Assert - structural elements must be present
  assertStringIncludes(result, '**Task**')
  assertStringIncludes(result, '**Timing Constraints**')
  assertStringIncludes(result, '**Output Format**')
  assertStringIncludes(result, 'TEXT FEEDBACK START')
  assertStringIncludes(result, 'JSON DATA START')
  assertStringIncludes(result, '**Lead-in:** First timestamp must be **> 5.0s**')
  assertStringIncludes(result, '**Spacing:** Maintain a **> 5.0s gap** between feedback points')
})

Deno.test('buildPromptFromConfig - JSON schema integrity', () => {
  // Arrange
  const duration = 6.3

  // Act
  const result = buildPromptFromConfig(ROAST_CONFIG, duration)

  // Assert - JSON schema must be intact
  assertStringIncludes(result, '"feedback": [')
  assertStringIncludes(result, '"timestamp": 0.0')
  assertStringIncludes(result, '"category": "String"')
  assertStringIncludes(result, '"message": "String"')
  assertStringIncludes(result, '"confidence": 0.0')
  assertStringIncludes(result, '"impact": 0.0')
})

Deno.test('buildPromptFromConfig - Different durations', () => {
  // Arrange
  const durations = [3.5, 6.3, 10.0, 30.25]

  // Act & Assert
  durations.forEach(duration => {
    const result = buildPromptFromConfig(ROAST_CONFIG, duration)
    // Format duration same way as buildPromptFromConfig (1 decimal place, remove trailing .0)
    const formattedDuration = duration.toFixed(1).replace(/\.0$/, '')
    assertStringIncludes(result, `${formattedDuration}s`, `Should include duration ${formattedDuration}s`)
  })
})

Deno.test('buildPromptFromConfig - Integer duration formatting', () => {
  // Arrange
  const duration = 10

  // Act
  const result = buildPromptFromConfig(ROAST_CONFIG, duration)

  // Assert
  assertStringIncludes(result, '10s')
})

