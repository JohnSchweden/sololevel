import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import { Platform } from 'react-native'
import { getNetworkErrorMessage, isOnline } from './networkDetection'

// Note: Native NetInfo tests skipped - requires @react-native-community/netinfo package

describe('networkDetection', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('isOnline', () => {
    it('should return true on web when navigator.onLine is true', async () => {
      ;(Platform.OS as string) = 'web'
      Object.defineProperty(global, 'navigator', {
        value: { onLine: true },
        writable: true,
        configurable: true,
      })

      const result = await isOnline()
      expect(result).toBe(true)
    })

    it('should return false on web when navigator.onLine is false', async () => {
      ;(Platform.OS as string) = 'web'
      Object.defineProperty(global, 'navigator', {
        value: { onLine: false },
        writable: true,
        configurable: true,
      })

      const result = await isOnline()
      expect(result).toBe(false)
    })

    it('should default to true on native (NetInfo not installed)', async () => {
      ;(Platform.OS as string) = 'ios'
      const result = await isOnline()
      expect(result).toBe(true) // Defaults to online on native
    })
  })

  describe('getNetworkErrorMessage', () => {
    it('should return offline message when device is offline', async () => {
      ;(Platform.OS as string) = 'web'
      Object.defineProperty(global, 'navigator', {
        value: { onLine: false },
        writable: true,
        configurable: true,
      })

      const message = await getNetworkErrorMessage('thumbnail', new Error('Network request failed'))
      expect(message).toContain('offline')
      expect(message).toContain('thumbnail')
    })

    it('should return network error message when online but network error occurred', async () => {
      ;(Platform.OS as string) = 'web'
      Object.defineProperty(global, 'navigator', {
        value: { onLine: true },
        writable: true,
        configurable: true,
      })

      const message = await getNetworkErrorMessage('video', new Error('network error'))
      expect(message).toContain('Network error')
      expect(message).toContain('video')
    })

    it('should return generic error message for non-network errors', async () => {
      ;(Platform.OS as string) = 'web'
      Object.defineProperty(global, 'navigator', {
        value: { onLine: true },
        writable: true,
        configurable: true,
      })

      const message = await getNetworkErrorMessage('thumbnail', new Error('File not found'))
      expect(message).toContain('Failed to load')
      expect(message).toContain('File not found')
    })
  })
})
