/// <reference types="jest" />

// Mock DocumentPickerResult
export interface DocumentPickerResult {
  type: 'success' | 'cancel'
  uri?: string
  name?: string
  size?: number
}

// Mock getDocumentAsync
export const getDocumentAsync = jest.fn(async (): Promise<DocumentPickerResult> => {
  return {
    type: 'cancel',
  }
})

// Export default
export default {
  getDocumentAsync,
}
