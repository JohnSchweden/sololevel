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
  config: GeminiConfig
): Promise<{ text: string; rawResponse: Record<string, unknown>; prompt: string }> {
  logger.info(
    `Generating content with Gemini (${config.mmModel}) using file: ${request.fileRef.name}`
  )

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
    // generationConfig: {
    //   temperature: request.temperature ?? 0.7,
    //   topK: request.topK ?? 40,
    //   topP: request.topP ?? 0.95,
    //   maxOutputTokens: request.maxOutputTokens ?? 2048,
    // },
  }

  const response = await fetch(`${config.mmGenerateUrl}?key=${config.apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  })

  logger.info(`Gemini generate response status: ${response.status}`)

  if (!response.ok) {
    const errorText = await response.text()
    logger.error(`Gemini generate error:`, errorText)
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

  logger.info(`Gemini generation completed: ${generatedText.length} characters`)
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
    // generationConfig: {
    //   temperature: request.temperature ?? 0.7,
    //   topK: request.topK ?? 40,
    //   topP: request.topP ?? 0.95,
    //   maxOutputTokens: request.maxOutputTokens,
    // },
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
