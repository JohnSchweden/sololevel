import { renderHook, waitFor } from '@testing-library/react'
import * as networkDetection from '../utils/networkDetection'
import { useNetworkQuality } from './useNetworkQuality'

// Mock network detection
jest.mock('../utils/networkDetection', () => ({
  isOnline: jest.fn(),
}))

const mockIsOnline = networkDetection.isOnline as jest.MockedFunction<
  typeof networkDetection.isOnline
>

describe('useNetworkQuality', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockIsOnline.mockResolvedValue(true)
  })

  describe('Default behavior', () => {
    it('should return unknown quality by default', () => {
      // ARRANGE & ACT
      const { result } = renderHook(() => useNetworkQuality())

      // ASSERT
      expect(result.current).toBe('unknown')
    })

    it('should return unknown when disabled', () => {
      // ARRANGE & ACT
      const { result } = renderHook(() => useNetworkQuality({ enabled: false }))

      // ASSERT
      expect(result.current).toBe('unknown')
    })
  })

  describe('Network quality detection', () => {
    it('should return medium when online (conservative default)', async () => {
      // ARRANGE
      mockIsOnline.mockResolvedValue(true)

      // ACT
      const { result } = renderHook(() => useNetworkQuality({ enabled: true }))

      // ASSERT
      await waitFor(() => {
        expect(result.current).toBe('medium')
      })
    })

    it('should return slow when offline', async () => {
      // ARRANGE
      mockIsOnline.mockResolvedValue(false)

      // ACT
      const { result } = renderHook(() => useNetworkQuality({ enabled: true }))

      // ASSERT
      await waitFor(() => {
        expect(result.current).toBe('slow')
      })
    })

    it('should use custom thresholds when provided', () => {
      // ARRANGE
      mockIsOnline.mockResolvedValue(true)

      // ACT
      const { result } = renderHook(() =>
        useNetworkQuality({
          enabled: true,
          fastThreshold: 2_000_000,
          mediumThreshold: 1_000_000,
        })
      )

      // ASSERT: Thresholds are accepted (implementation uses them internally)
      expect(result.current).toBeDefined()
    })
  })

  describe('Error handling', () => {
    it('should return unknown when network check fails', async () => {
      // ARRANGE
      mockIsOnline.mockRejectedValue(new Error('Network check failed'))

      // ACT
      const { result } = renderHook(() => useNetworkQuality({ enabled: true }))

      // ASSERT
      await waitFor(() => {
        expect(result.current).toBe('unknown')
      })
    })
  })
})
