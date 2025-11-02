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
