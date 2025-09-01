import { vi } from 'vitest'

// Mock DocumentPickerResult
export interface DocumentPickerResult {
  type: 'success' | 'cancel'
  uri?: string
  name?: string
  size?: number
  mimeType?: string
}

// Mock getDocumentAsync
export const getDocumentAsync = vi.fn(async (): Promise<DocumentPickerResult> => {
  return {
    type: 'cancel',
  }
})

// Mock DocumentPickerOptions
export interface DocumentPickerOptions {
  type?: string | string[]
  copyToCacheDirectory?: boolean
  multiple?: boolean
}

// Export default
export default {
  getDocumentAsync,
}
