/// <reference types="jest" />

// Manual mock for expo-file-system - preferred approach per @testing-unified.mdc
// Provides default behaviors that tests can override
export const documentDirectory = 'file:///documents/'
export const cacheDirectory = 'file:///cache/'

export const getInfoAsync = jest.fn().mockResolvedValue({
  exists: true,
  size: 0,
  modificationTime: 0,
})
export const makeDirectoryAsync = jest.fn().mockResolvedValue(undefined)
export const copyAsync = jest.fn().mockResolvedValue(undefined)
export const readDirectoryAsync = jest.fn().mockResolvedValue([])
export const deleteAsync = jest.fn().mockResolvedValue(undefined)
export const writeAsStringAsync = jest.fn().mockResolvedValue(undefined)
export const readAsStringAsync = jest.fn().mockResolvedValue('')
export const downloadAsync = jest.fn().mockResolvedValue({})
export const createDownloadResumable = jest
  .fn()
  .mockImplementation((url: string, fileUri: string) => {
    let aborted = false

    return {
      downloadAsync: jest.fn().mockImplementation(() => {
        if (aborted) {
          const abortError = new Error('Aborted')
          abortError.name = 'AbortError'
          return Promise.reject(abortError)
        }
        return Promise.resolve({ uri: fileUri, url })
      }),
      pauseAsync: jest.fn().mockImplementation(() => {
        aborted = true
        return Promise.resolve({ url, fileUri })
      }),
      resumeAsync: jest.fn(),
    }
  })
