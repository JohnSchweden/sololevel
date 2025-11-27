/**
 * Tests for useCameraPermissions hooks
 *
 * Tests user-visible behavior: permission requests, error handling, settings redirect
 * Following TDD and testing philosophy: focus on user behavior, not implementation
 */

import { act, renderHook } from '@testing-library/react'
import { Alert, Linking, Platform } from 'react-native'
import { useFeatureFlagsStore } from '../../../stores/feature-flags'
import { useCameraRecordingStore } from '../stores/cameraRecording'
import {
  type BasePermissionResponse,
  useBaseCameraPermissions,
  usePermissionModal,
} from './useCameraPermissions.native'

// Alert and Linking are already mocked in test-utils/setup.ts
// We'll access them directly and mock their implementations

// Mock Zustand stores
jest.mock('../stores/cameraRecording', () => ({
  useCameraRecordingStore: jest.fn(),
}))

jest.mock('../../../stores/feature-flags', () => ({
  useFeatureFlagsStore: jest.fn(),
}))

// Mock logging
jest.mock('@my/logging', () => ({
  log: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}))

const mockSetPermissions = jest.fn()
const mockSetPermissionModalOpen = jest.fn()

beforeEach(() => {
  jest.clearAllMocks()
  ;(useCameraRecordingStore as jest.Mock).mockReturnValue({
    setPermissions: mockSetPermissions,
    setPermissionModalOpen: mockSetPermissionModalOpen,
    showPermissionModal: false,
  })
  ;(useFeatureFlagsStore as unknown as jest.Mock).mockReturnValue({
    flags: { useVisionCamera: false },
  })
  // Reset global state
  ;(global as any).globalPermissionRequestInProgress = false
  // Setup default mocks for Alert and Linking
  if (Alert && Alert.alert) {
    ;(Alert.alert as jest.Mock).mockResolvedValue(undefined)
  }
  if (Linking && Linking.openURL) {
    ;(Linking.openURL as jest.Mock).mockResolvedValue(undefined)
  }
  if (Linking && Linking.openSettings) {
    ;(Linking.openSettings as jest.Mock).mockResolvedValue(undefined)
  }
})

describe('useBaseCameraPermissions', () => {
  describe('Permission request flow', () => {
    it('should request permission successfully when granted', async () => {
      // 🧪 ARRANGE: Mock permission response
      const mockPermission: BasePermissionResponse = {
        granted: true,
        status: 'granted',
        canAskAgain: true,
      }
      const requestPermissionFn = jest.fn().mockResolvedValue(mockPermission)

      // 🎬 ACT: Render hook and request permission
      const { result } = renderHook(() => useBaseCameraPermissions({}))
      let requestResult: boolean
      await act(async () => {
        requestResult = await result.current.requestPermissionWithRationale(
          requestPermissionFn,
          false
        )
      })

      // ✅ ASSERT: Should succeed
      expect(requestResult!).toBe(true)
      expect(requestPermissionFn).toHaveBeenCalledTimes(1)
      // Note: updateStorePermissions is called by the platform-specific hook, not base hook
    })

    it('should handle denied permission gracefully', async () => {
      // 🧪 ARRANGE: Mock denied permission
      const mockPermission: BasePermissionResponse = {
        granted: false,
        status: 'denied',
        canAskAgain: true,
      }
      const requestPermissionFn = jest.fn().mockResolvedValue(mockPermission)
      const onError = jest.fn()

      // 🎬 ACT: Request permission
      const { result } = renderHook(() => useBaseCameraPermissions({ onError }))
      let requestResult: boolean
      await act(async () => {
        requestResult = await result.current.requestPermissionWithRationale(
          requestPermissionFn,
          false
        )
      })

      // ✅ ASSERT: Should fail and call error handler
      expect(requestResult!).toBe(false)
      expect(onError).toHaveBeenCalledWith('Camera permission was denied. Please try again later.')
      expect(result.current.error).toBeTruthy()
    })

    it('should show settings redirect for permanently denied permission', async () => {
      // 🧪 ARRANGE: Mock permanently denied permission
      const mockPermission: BasePermissionResponse = {
        granted: false,
        status: 'denied',
        canAskAgain: false,
      }
      const requestPermissionFn = jest.fn().mockResolvedValue(mockPermission)
      // Mock Alert if available
      if (Alert && Alert.alert) {
        ;(Alert.alert as jest.Mock).mockImplementation((_title, _message, buttons) => {
          // Simulate user clicking "Open Settings"
          if (buttons && buttons[1]) {
            buttons[1].onPress()
          }
        })
      }

      // 🎬 ACT: Request permission
      const { result } = renderHook(() =>
        useBaseCameraPermissions({ enableSettingsRedirect: true })
      )
      await act(async () => {
        await result.current.requestPermissionWithRationale(requestPermissionFn, false)
      })

      // ✅ ASSERT: Should show alert and redirect to settings
      if (Alert && Alert.alert) {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Permission Required',
          'Camera access was denied. You can enable it in Settings.',
          expect.any(Array)
        )
      }
      if (Linking && Linking.openURL) {
        expect(Linking.openURL).toHaveBeenCalledWith('app-settings:')
      }
    })

    it('should skip request if already granted', async () => {
      // 🧪 ARRANGE: Permission already granted
      const requestPermissionFn = jest.fn()

      // 🎬 ACT: Request permission when already granted
      const { result } = renderHook(() => useBaseCameraPermissions({}))
      let requestResult: boolean
      await act(async () => {
        requestResult = await result.current.requestPermissionWithRationale(
          requestPermissionFn,
          true // Already granted
        )
      })

      // ✅ ASSERT: Should return true without calling request function
      expect(requestResult!).toBe(true)
      expect(requestPermissionFn).not.toHaveBeenCalled()
    })

    it('should prevent concurrent permission requests', async () => {
      // 🧪 ARRANGE: Mock slow permission request
      const mockPermission: BasePermissionResponse = {
        granted: true,
        status: 'granted',
        canAskAgain: true,
      }
      let resolveFirst: () => void
      const firstRequest = new Promise<BasePermissionResponse>((resolve) => {
        resolveFirst = () => resolve(mockPermission)
      })
      const requestPermissionFn1 = jest.fn().mockReturnValue(firstRequest)
      const requestPermissionFn2 = jest.fn().mockResolvedValue(mockPermission)

      // 🎬 ACT: Start first request, then try second
      const { result } = renderHook(() => useBaseCameraPermissions({}))
      const promise1 = act(async () => {
        return result.current.requestPermissionWithRationale(requestPermissionFn1, false)
      })
      const promise2 = act(async () => {
        return result.current.requestPermissionWithRationale(requestPermissionFn2, false)
      })

      // Complete first request
      act(() => {
        resolveFirst!()
      })

      const [result1, result2] = await Promise.all([promise1, promise2])

      // ✅ ASSERT: First should succeed, second should be blocked
      expect(result1).toBe(true)
      expect(result2).toBe(false)
      expect(requestPermissionFn1).toHaveBeenCalledTimes(1)
      expect(requestPermissionFn2).not.toHaveBeenCalled()
    })
  })

  describe('Error handling', () => {
    it('should handle permission request errors', async () => {
      // 🧪 ARRANGE: Mock error
      const requestPermissionFn = jest
        .fn()
        .mockRejectedValue(new Error('Permission request failed'))
      const onError = jest.fn()

      // 🎬 ACT: Request permission
      const { result } = renderHook(() => useBaseCameraPermissions({ onError }))
      let requestResult: boolean
      await act(async () => {
        requestResult = await result.current.requestPermissionWithRationale(
          requestPermissionFn,
          false
        )
      })

      // ✅ ASSERT: Should handle error gracefully
      expect(requestResult!).toBe(false)
      expect(onError).toHaveBeenCalledWith('Permission request failed')
      expect(result.current.error).toBe('Permission request failed')
    })

    it('should clear error when clearError is called', async () => {
      // 🧪 ARRANGE: Set error state
      const requestPermissionFn = jest.fn().mockRejectedValue(new Error('Test error'))
      const { result } = renderHook(() => useBaseCameraPermissions({}))

      await act(async () => {
        await result.current.requestPermissionWithRationale(requestPermissionFn, false)
      })
      expect(result.current.error).toBeTruthy()

      // 🎬 ACT: Clear error
      act(() => {
        result.current.clearError()
      })

      // ✅ ASSERT: Error should be cleared
      expect(result.current.error).toBeNull()
    })
  })

  describe('Settings redirect', () => {
    it('should redirect to iOS settings', async () => {
      // 🧪 ARRANGE: iOS platform (default in test setup)
      if (Linking && Linking.openURL) {
        ;(Linking.openURL as jest.Mock).mockResolvedValue(undefined)
      }

      // 🎬 ACT: Redirect to settings
      const { result } = renderHook(() => useBaseCameraPermissions({}))
      await act(async () => {
        await result.current.redirectToSettings()
      })

      // ✅ ASSERT: Should open iOS settings URL
      if (Linking && Linking.openURL) {
        expect(Linking.openURL).toHaveBeenCalledWith('app-settings:')
      }
    })

    it('should redirect to Android settings', async () => {
      // 🧪 ARRANGE: Android platform
      const originalOS = Platform.OS
      Object.defineProperty(Platform, 'OS', {
        value: 'android',
        writable: true,
        configurable: true,
      })
      if (Linking && Linking.openSettings) {
        ;(Linking.openSettings as jest.Mock).mockResolvedValue(undefined)
      }

      // 🎬 ACT: Redirect to settings
      const { result } = renderHook(() => useBaseCameraPermissions({}))
      await act(async () => {
        await result.current.redirectToSettings()
      })

      // ✅ ASSERT: Should open Android settings
      if (Linking && Linking.openSettings) {
        expect(Linking.openSettings).toHaveBeenCalled()
      }
      // Restore Platform.OS
      Object.defineProperty(Platform, 'OS', {
        value: originalOS,
        writable: true,
        configurable: true,
      })
    })

    it('should handle settings redirect errors', async () => {
      // 🧪 ARRANGE: Mock error (iOS platform)
      if (Linking && Linking.openURL) {
        ;(Linking.openURL as jest.Mock).mockRejectedValue(new Error('Cannot open settings'))
      }
      const onError = jest.fn()

      // 🎬 ACT: Redirect to settings
      const { result } = renderHook(() => useBaseCameraPermissions({ onError }))
      await act(async () => {
        await result.current.redirectToSettings()
      })

      // ✅ ASSERT: Should handle error
      expect(onError).toHaveBeenCalled()
      expect(result.current.error).toBeTruthy()
    })
  })

  describe('Store integration', () => {
    it('should update store when permission changes', async () => {
      // 🧪 ARRANGE: Mock permission
      const mockPermission: BasePermissionResponse = {
        granted: true,
        status: 'granted',
        canAskAgain: true,
      }

      // 🎬 ACT: Update store permissions
      const { result } = renderHook(() => useBaseCameraPermissions({}))
      act(() => {
        result.current.updateStorePermissions(mockPermission, true)
      })

      // ✅ ASSERT: Should update store
      expect(mockSetPermissions).toHaveBeenCalledWith({
        camera: 'granted',
        microphone: 'granted',
      })
    })

    it('should call onPermissionChange callback', async () => {
      // 🧪 ARRANGE: Mock callback
      const onPermissionChange = jest.fn()
      const mockPermission: BasePermissionResponse = {
        granted: true,
        status: 'granted',
        canAskAgain: true,
      }

      // 🎬 ACT: Update permissions
      const { result } = renderHook(() => useBaseCameraPermissions({ onPermissionChange }))
      act(() => {
        result.current.updateStorePermissions(mockPermission)
      })

      // ✅ ASSERT: Should call callback
      expect(onPermissionChange).toHaveBeenCalledWith(mockPermission)
    })
  })

  describe('Retry request', () => {
    it('should retry permission request after clearing error', async () => {
      // 🧪 ARRANGE: First request fails, second succeeds
      const mockPermission: BasePermissionResponse = {
        granted: true,
        status: 'granted',
        canAskAgain: true,
      }
      const requestPermissionFn = jest
        .fn()
        .mockRejectedValueOnce(new Error('First attempt failed'))
        .mockResolvedValueOnce(mockPermission)

      // 🎬 ACT: Request, then retry
      const { result } = renderHook(() => useBaseCameraPermissions({}))
      await act(async () => {
        await result.current.requestPermissionWithRationale(requestPermissionFn, false)
      })
      expect(result.current.error).toBeTruthy()

      let retryResult: boolean
      await act(async () => {
        retryResult = await result.current.retryRequest(requestPermissionFn, false)
      })

      // ✅ ASSERT: Retry should succeed
      expect(retryResult!).toBe(true)
      expect(requestPermissionFn).toHaveBeenCalledTimes(2)
      expect(result.current.error).toBeNull()
    })
  })
})

describe('usePermissionModal', () => {
  it('should open and close permission modal', () => {
    // 🧪 ARRANGE: Mock store with modal closed
    ;(useCameraRecordingStore as jest.Mock).mockReturnValue({
      setPermissionModalOpen: mockSetPermissionModalOpen,
      showPermissionModal: false,
    })

    // 🎬 ACT: Render hook and open modal
    const { result } = renderHook(() => usePermissionModal())
    act(() => {
      result.current.openModal()
    })

    // ✅ ASSERT: Should open modal
    expect(mockSetPermissionModalOpen).toHaveBeenCalledWith(true)
  })

  it('should close permission modal', () => {
    // 🧪 ARRANGE: Mock store with modal open
    ;(useCameraRecordingStore as jest.Mock).mockReturnValue({
      setPermissionModalOpen: mockSetPermissionModalOpen,
      showPermissionModal: true,
    })

    // 🎬 ACT: Close modal
    const { result } = renderHook(() => usePermissionModal())
    act(() => {
      result.current.closeModal()
    })

    // ✅ ASSERT: Should close modal
    expect(mockSetPermissionModalOpen).toHaveBeenCalledWith(false)
  })

  it('should return correct modal visibility state', () => {
    // 🧪 ARRANGE: Mock store with modal open
    ;(useCameraRecordingStore as jest.Mock).mockReturnValue({
      setPermissionModalOpen: mockSetPermissionModalOpen,
      showPermissionModal: true,
    })

    // 🎬 ACT: Render hook
    const { result } = renderHook(() => usePermissionModal())

    // ✅ ASSERT: Should reflect modal state
    expect(result.current.isVisible).toBe(true)
  })
})
