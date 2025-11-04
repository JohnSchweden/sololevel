/**
 * renderFixUtils - Utilities for fixing common re-render issues
 *
 * Provides helpers for:
 * - Content-based memoization (signature comparison)
 * - Stable object creation for hooks
 * - Prop comparison for React.memo custom comparators
 *
 * Based on patterns documented in .remember/memory/self.md
 */

import { useMemo, useRef } from 'react'

/**
 * Generate a signature for an object/value for content-based comparison
 * Useful when object references change but content is stable
 */
export function getObjectSignature(value: unknown): string {
  if (value === null || value === undefined) {
    return String(value)
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  if (typeof value === 'function') {
    // Functions compared by reference only
    return 'function'
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return '[]'
    const firstThree = value
      .slice(0, 3)
      .map((item) => getObjectSignature(item))
      .join(',')
    return `[${value.length}:${firstThree}]`
  }

  if (typeof value === 'object') {
    const keys = Object.keys(value).sort()
    if (keys.length === 0) return '{}'
    const sig = keys
      .slice(0, 5)
      .map((key) => {
        const val = (value as Record<string, unknown>)[key]
        const valSig = getObjectSignature(val)
        return `${key}:${valSig}`
      })
      .join(',')
    return `{${keys.length}:${sig}}`
  }

  return String(value)
}

/**
 * Content-based memoization hook
 *
 * Memoizes based on object content (signature) rather than reference.
 * Useful when parent passes new object references but content is stable.
 *
 * @example
 * ```tsx
 * const stableObject = useContentMemoized(
 *   unstableObject,
 *   [otherPrimitiveDeps]
 * );
 * ```
 */
export function useContentMemoized<T>(value: T, dependencies: unknown[] = []): T {
  const prevSignatureRef = useRef<string | null>(null)
  const cachedValueRef = useRef<T>(value)

  return useMemo(() => {
    const currentSignature = getObjectSignature(value)

    // If signature changed, update cache
    if (prevSignatureRef.current !== currentSignature) {
      prevSignatureRef.current = currentSignature
      cachedValueRef.current = value
      return value
    }

    // Signature unchanged, return cached value
    return cachedValueRef.current
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getObjectSignature(value), ...dependencies])
}

/**
 * Stable object creator for hooks
 *
 * Creates a stable object reference that only changes when dependencies change.
 * Automatically handles primitive extraction for better memoization.
 *
 * @example
 * ```tsx
 * function useMyHook() {
 *   const data = useStableObject({
 *     value: someValue,
 *     flag: someFlag,
 *     handlers: { onClick, onFocus },
 *   }, [someValue, someFlag, onClick, onFocus]);
 *
 *   return data;
 * }
 * ```
 */
export function useStableObject<T extends Record<string, unknown>>(
  object: T,
  dependencies: unknown[]
): T {
  return useMemo(() => object, dependencies)
}

/**
 * Create a prop comparator for React.memo
 *
 * Compares props by value (content) rather than reference.
 * Useful when parent creates new object references but values are stable.
 *
 * @example
 * ```tsx
 * const MyComponent = memo(
 *   function MyComponent(props) {
 *     // ...
 *   },
 *   createContentComparator(['data', 'config'])
 * );
 * ```
 */
export function createContentComparator<T extends Record<string, unknown>>(
  keysToCompare?: (keyof T)[]
) {
  return (prevProps: T, nextProps: T): boolean => {
    // If no keys specified, compare all
    const keys = keysToCompare || (Object.keys(prevProps) as (keyof T)[])

    for (const key of keys) {
      const prev = prevProps[key]
      const next = nextProps[key]

      // Reference equality (fast path)
      if (prev === next) continue

      // Content equality check
      const prevSig = getObjectSignature(prev)
      const nextSig = getObjectSignature(next)

      if (prevSig !== nextSig) {
        return false // Props are different
      }
    }

    return true // Props are equal
  }
}

/**
 * Create a prop comparator that ignores specific keys
 *
 * Useful when some props are intentionally unstable (e.g., Reanimated gestures)
 *
 * @example
 * ```tsx
 * const MyComponent = memo(
 *   function MyComponent(props) {
 *     // ...
 *   },
 *   createIgnoredKeysComparator(['gesture', 'animation'])
 * );
 * ```
 */
export function createIgnoredKeysComparator<T extends Record<string, unknown>>(
  ignoreKeys: (keyof T)[]
) {
  return (prevProps: T, nextProps: T): boolean => {
    const keys = Object.keys(prevProps) as (keyof T)[]

    for (const key of keys) {
      // Skip intentionally unstable props
      if (ignoreKeys.includes(key)) continue

      if (prevProps[key] !== nextProps[key]) {
        return false
      }
    }

    return true
  }
}

/**
 * Extract primitives from an object for use in dependency arrays
 *
 * Useful when hook returns object but you need primitives for useMemo deps
 *
 * @example
 * ```tsx
 * const videoAudioSync = useSomeHook();
 * const primitives = extractPrimitives(videoAudioSync, ['isPlaying', 'isAudioActive']);
 *
 * const memoized = useMemo(() => {
 *   // ...
 * }, [primitives.isPlaying, primitives.isAudioActive]);
 * ```
 */
export function extractPrimitives<T extends Record<string, unknown>>(
  object: T,
  keys: (keyof T)[]
): Partial<Record<keyof T, unknown>> {
  const result: Partial<Record<keyof T, unknown>> = {}
  for (const key of keys) {
    const value = object[key]
    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      value === null ||
      value === undefined
    ) {
      result[key] = value
    }
  }
  return result
}
