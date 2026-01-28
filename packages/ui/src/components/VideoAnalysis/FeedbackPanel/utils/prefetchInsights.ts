/**
 * Utility for prefetching Insights module
 *
 * Extracted to allow mocking in tests without polluting production code
 * with test-specific conditionals.
 */

/**
 * Prefetches the VideoAnalysisInsightsV2 module
 *
 * This is a performance optimization to reduce cold-start fallback
 * when users switch to the Insights tab.
 *
 * In test environments, this is a no-op (Jest doesn't support dynamic imports without ESM).
 *
 * @returns Promise that resolves when module is loaded (or immediately in tests)
 */
export function prefetchInsights(): Promise<void> {
  // Skip prefetch in test environment (Jest doesn't support dynamic imports without ESM)
  if (process.env.NODE_ENV === 'test') {
    return Promise.resolve()
  }

  // Import path is relative to FeedbackPanel directory (parent of utils/)
  return import('../VideoAnalysisInsightsV2').then(() => {
    // Module loaded successfully
  })
}
