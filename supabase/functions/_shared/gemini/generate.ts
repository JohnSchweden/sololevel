/**
 * Gemini Content Generation Client
 * Handles content generation requests to Gemini API
 */

import { createLogger } from '../logger.ts'
import type { GeminiConfig } from './config.ts'
import type { GeminiFileReference } from './filesClient.ts'

const logger = createLogger('gemini-generate')

/**
 * Generation request parameters
 */
export interface GenerateRequest {
  fileRef: GeminiFileReference
  prompt: string
  temperature?: number
  topK?: number
  topP?: number
  maxOutputTokens?: number
}

/**
 * Text-only generation request parameters
 */
export interface GenerateTextOnlyRequest {
  prompt: string
  temperature?: number
  topK?: number
  topP?: number
  maxOutputTokens?: number
}

/**
 * Generate content with Gemini using uploaded file
 * Returns both the generated text and the raw API response
 */
export async function generateContent(
  request: GenerateRequest,
  config: GeminiConfig,
  dbLogger?: { info: (msg: string, data?: any) => void; error: (msg: string, data?: any) => void; child?: (module: string) => any }
): Promise<{ text: string; rawResponse: Record<string, unknown>; prompt: string }> {
  logger.info(
    `Generating content with Gemini (${config.mmModel}) using file: ${request.fileRef.name}`
  )
  const generateLogger = dbLogger?.child ? dbLogger.child('gemini-generate') : dbLogger
  generateLogger?.info('Starting content generation with Gemini', {
    fileName: request.fileRef.name,
    model: config.mmModel,
    promptLength: request.prompt.length
  })

  const requestBody = {
    contents: [
      {
        parts: [
          { text: request.prompt },
          // v1beta expects fileData with fileUri
          { fileData: { fileUri: request.fileRef.uri, mimeType: request.fileRef.mimeType } },
        ],
      },
    ],
  }

  const response = await fetch(`${config.mmGenerateUrl}?key=${config.apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  })

  logger.info(`Gemini generate response status: ${response.status}`)
  generateLogger?.info('Gemini generate response received', {
    fileName: request.fileRef.name,
    status: response.status
  })

  if (!response.ok) {
    const errorText = await response.text()
    logger.error(`Gemini generate error:`, errorText)
    generateLogger?.error('Gemini generate error', {
      fileName: request.fileRef.name,
      status: response.status,
      statusText: response.statusText,
      error: errorText?.slice(0, 500)
    })
    throw new Error(
      `Gemini generate error: ${response.status} ${response.statusText} - ${errorText}`
    )
  }

  const data = await response.json()

  // Log full response structure for debugging
  logger.debug('Gemini response structure', {
    hasCandidates: !!data.candidates,
    candidatesLength: data.candidates?.length ?? 0,
    firstCandidateKeys: data.candidates?.[0] ? Object.keys(data.candidates[0]) : [],
    hasContent: !!data.candidates?.[0]?.content,
    contentKeys: data.candidates?.[0]?.content ? Object.keys(data.candidates[0].content) : [],
    hasParts: !!data.candidates?.[0]?.content?.parts,
    partsLength: data.candidates?.[0]?.content?.parts?.length ?? 0,
  })

  // Find the first part with text content instead of assuming index 0
  const candidate = data.candidates?.[0]
  const parts = candidate?.content?.parts ?? []
  const generatedText = parts.find((p: any) => typeof p.text === 'string')?.text

  if (!generatedText) {
    // Check for alternative response structures (some models return text directly)
    let alternativeText: string | undefined
    if (candidate?.content && typeof candidate.content === 'string') {
      alternativeText = candidate.content
    } else if (candidate?.text && typeof candidate.text === 'string') {
      alternativeText = candidate.text
    } else if (parts.length > 0 && typeof parts[0] === 'string') {
      alternativeText = parts[0]
    }

    if (alternativeText) {
      logger.info('Found text in alternative response structure', {
        location: candidate?.content && typeof candidate.content === 'string' ? 'content' : candidate?.text ? 'text' : 'parts[0]',
      })
      generateLogger?.info('Found text in alternative response structure', {
        fileName: request.fileRef.name,
        textLength: alternativeText.length,
      })
      return {
        text: alternativeText,
        rawResponse: data,
        prompt: request.prompt
      }
    }

    // Check if content was blocked by safety filters
    const blockedBySafety = candidate?.safetyRatings?.some((r: any) => 
      r.category && r.probability && r.probability !== 'NEGLIGIBLE' && r.probability !== 'LOW'
    ) || data.promptFeedback?.blockReason

    // Log detailed diagnostic information when no text is found
    const diagnosticInfo = {
      finishReason: candidate?.finishReason,
      promptFeedback: data.promptFeedback,
      safetyRatings: candidate?.safetyRatings,
      partTypes: parts.map((p: any) => Object.keys(p).join(',')),
      responseKeys: Object.keys(data),
      candidateStructure: candidate ? {
        keys: Object.keys(candidate),
        hasContent: !!candidate.content,
        contentKeys: candidate.content && typeof candidate.content === 'object' ? Object.keys(candidate.content) : [],
        contentType: candidate.content ? typeof candidate.content : undefined,
      } : null,
      blockedBySafety,
      rawResponseSnippet: JSON.stringify(data).substring(0, 2000), // First 2000 chars for debugging
    }
    
    logger.error('No text content found in Gemini response', diagnosticInfo)
    generateLogger?.error('No text content found in Gemini response', {
      fileName: request.fileRef.name,
      finishReason: candidate?.finishReason,
      promptFeedback: data.promptFeedback,
      safetyRatings: candidate?.safetyRatings,
      partsLength: parts.length,
      hasCandidates: !!data.candidates,
      candidatesLength: data.candidates?.length ?? 0,
      blockedBySafety,
    })
    
    const errorMessage = blockedBySafety 
      ? 'Response blocked by safety filters' 
      : 'No response generated from Gemini API'
    throw new Error(errorMessage)
  }

  logger.info(`Gemini generation completed: ${generatedText.length} characters`)
  generateLogger?.info('Gemini generation completed', {
    fileName: request.fileRef.name,
    textLength: generatedText.length
  })
  return {
    text: generatedText,
    rawResponse: data,
    prompt: request.prompt
  }
}

/**
 * Generate text-only content with Gemini (no file attachment)
 * Returns both the generated text and the raw API response
 */
export async function generateTextOnlyContent(
  request: GenerateTextOnlyRequest,
  config: GeminiConfig
): Promise<{ text: string; rawResponse: Record<string, unknown>; prompt: string }> {
  logger.info(`Generating text-only content with Gemini (${config.llmModel})`)

  const requestBody = {
    contents: [
      {
        parts: [{ text: request.prompt }],
      },
    ],
  }

  const response = await fetch(`${config.llmGenerateUrl}?key=${config.apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  })

  logger.info(`Gemini text-only generate response status: ${response.status}`)

  if (!response.ok) {
    const errorText = await response.text()
    logger.error(`Gemini text-only generate error:`, errorText)
    throw new Error(
      `Gemini generate error: ${response.status} ${response.statusText} - ${errorText}`
    )
  }

  const data = await response.json()

  // Find the first part with text content instead of assuming index 0
  const parts = data.candidates?.[0]?.content?.parts ?? []
  const generatedText = parts.find((p: any) => typeof p.text === 'string')?.text

  if (!generatedText) {
    // Log diagnostic information when no text is found
    logger.error('No text content found in Gemini response', {
      finishReason: data.candidates?.[0]?.finishReason,
      promptFeedback: data.promptFeedback,
      safetyRatings: data.candidates?.[0]?.safetyRatings,
      partTypes: parts.map((p: any) => Object.keys(p).join(',')),
      responseKeys: Object.keys(data)
    })
    throw new Error('No response generated from Gemini API')
  }

  logger.info(`Gemini text-only generation completed: ${generatedText.length} characters`)
  return {
    text: generatedText,
    rawResponse: data,
    prompt: request.prompt
  }
}
