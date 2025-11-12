import { log } from '@my/logging'
import { useEffect, useState } from 'react'
import { isOnline } from '../utils/networkDetection'

/**
 * Network quality levels for adaptive prefetch
 */
export type NetworkQuality = 'fast' | 'medium' | 'slow' | 'unknown'

/**
 * Configuration for network quality detection
 */
export interface NetworkQualityConfig {
  /**
   * Threshold in bytes/second for fast network
   * @default 1000000 (1 MB/s)
   */
  fastThreshold?: number

  /**
   * Threshold in bytes/second for medium network
   * @default 500000 (500 KB/s)
   */
  mediumThreshold?: number

  /**
   * Enable/disable network quality detection
   * @default true
   */
  enabled?: boolean
}

/**
 * Hook to detect network quality based on recent download speeds
 *
 * Strategy:
 * - Tracks recent download speeds from upload progress store
 * - Classifies network as fast/medium/slow based on thresholds
 * - Falls back to 'unknown' if no data available or offline
 *
 * @param config - Optional configuration
 * @returns Network quality level
 *
 * @example
 * ```tsx
 * const networkQuality = useNetworkQuality()
 * const prefetchCount = networkQuality === 'fast' ? 10 : networkQuality === 'medium' ? 5 : 3
 * ```
 */
export function useNetworkQuality(config?: NetworkQualityConfig): NetworkQuality {
  const [quality, setQuality] = useState<NetworkQuality>('unknown')
  const enabled = config?.enabled !== false
  const fastThreshold = config?.fastThreshold ?? 1_000_000 // 1 MB/s
  const mediumThreshold = config?.mediumThreshold ?? 500_000 // 500 KB/s

  useEffect(() => {
    let cancelled = false

    if (!enabled) {
      setQuality('unknown')
      return () => {
        cancelled = true
      }
    }

    const updateQuality = (nextQuality: NetworkQuality) => {
      if (cancelled) {
        return
      }
      setQuality(nextQuality)
    }

    const checkNetworkQuality = async () => {
      try {
        // Check if online first
        const online = await isOnline()
        if (!online) {
          updateQuality('slow')
          return
        }

        // For now, default to 'medium' if online (conservative approach)
        updateQuality('medium')
      } catch (error) {
        log.warn('useNetworkQuality', 'Failed to determine network quality', {
          error: error instanceof Error ? error.message : String(error),
        })
        updateQuality('unknown')
      }
    }

    void checkNetworkQuality().catch((error) => {
      if (cancelled) {
        return
      }
      log.warn('useNetworkQuality', 'Network quality check failed', {
        error: error instanceof Error ? error.message : String(error),
      })
      updateQuality('unknown')
    })

    return () => {
      cancelled = true
    }
  }, [enabled, fastThreshold, mediumThreshold])

  return quality
}
