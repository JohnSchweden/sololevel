/**
 * useRenderDiagnostics - Cross-platform hook for detecting unnecessary re-renders
 *
 * Tracks prop changes, object reference changes, and content changes to help
 * identify why components re-render. Works identically on web and native.
 *
 * Usage:
 * ```tsx
 * function MyComponent({ data, handlers, config }) {
 *   useRenderDiagnostics('MyComponent', { data, handlers, config });
 *   // ... component code
 * }
 * ```
 *
 * This hook logs:
 * - Which props changed (reference or content)
 * - Object signature comparisons (content-based)
 * - Render count and timing
 */

import { useEffect, useRef } from 'react'

import { log } from '@my/logging'

export interface PropChange {
  prop: string
  changed: boolean
  referenceChanged: boolean
  contentChanged: boolean
  prevValue: unknown
  nextValue: unknown
}

export interface RenderDiagnostics {
  renderCount: number
  propChanges: PropChange[]
  hasReferenceChanges: boolean
  hasContentChanges: boolean
}

type Signature = string | number | boolean | null | undefined

/**
 * Generate a signature for an object/value for content-based comparison
 */
function getSignature(value: unknown): Signature {
  if (value === null || value === undefined) {
    return value as Signature
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value as Signature
  }

  if (typeof value === 'function') {
    // Functions are compared by reference only
    return 'function'
  }

  if (Array.isArray(value)) {
    // Array signature: length + first few items
    if (value.length === 0) return '[]'
    const firstThree = value
      .slice(0, 3)
      .map((item) => getSignature(item))
      .join(',')
    return `[${value.length}:${firstThree}]` as Signature
  }

  if (typeof value === 'object') {
    // Object signature: sorted keys + first level values
    const keys = Object.keys(value).sort()
    if (keys.length === 0) return '{}'
    const sig = keys
      .slice(0, 5)
      .map((key) => {
        const val = (value as Record<string, unknown>)[key]
        const valSig = getSignature(val)
        return `${key}:${valSig}`
      })
      .join(',')
    return `{${keys.length}:${sig}}` as Signature
  }

  return String(value) as Signature
}

/**
 * Compare two values for content equality (not reference)
 */
function contentEquals(prev: unknown, next: unknown): boolean {
  // Primitive comparison
  if (prev === next) return true

  // Both null/undefined
  if ((prev == null && next == null) || (prev === undefined && next === undefined)) {
    return true
  }

  // Type mismatch
  if (typeof prev !== typeof next) return false

  // Array comparison (shallow)
  if (Array.isArray(prev) && Array.isArray(next)) {
    if (prev.length !== next.length) return false
    return prev.every((item, index) => item === next[index])
  }

  // Object comparison (shallow by signature)
  if (typeof prev === 'object' && typeof next === 'object' && prev !== null && next !== null) {
    const prevSig = getSignature(prev)
    const nextSig = getSignature(next)
    return prevSig === nextSig
  }

  return false
}

interface UseRenderDiagnosticsOptions {
  enabled?: boolean
  logToConsole?: boolean
  logOnlyChanges?: boolean
}

/**
 * Hook to diagnose why a component re-rendered
 *
 * @param componentName - Name of the component (for logging)
 * @param props - Props object to track
 * @param options - Configuration options
 */
export function useRenderDiagnostics<T extends Record<string, unknown>>(
  componentName: string,
  props: T,
  options: UseRenderDiagnosticsOptions = {}
): RenderDiagnostics {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isDev = (globalThis as any).__DEV__ !== false && process.env.NODE_ENV !== 'production'
  const { enabled = isDev, logToConsole = false, logOnlyChanges = true } = options

  const renderCountRef = useRef(0)
  const prevPropsRef = useRef<T | null>(null)
  const propChangesRef = useRef<PropChange[]>([])

  renderCountRef.current += 1
  const currentRender = renderCountRef.current

  useEffect(() => {
    if (!enabled) return

    const prevProps = prevPropsRef.current
    propChangesRef.current = []

    if (prevProps === null) {
      // First render - no comparison
      prevPropsRef.current = { ...props }
      return
    }

    // Compare each prop
    const allKeys = new Set([...Object.keys(prevProps), ...Object.keys(props)])
    let hasReferenceChanges = false
    let hasContentChanges = false

    // Convert Set to Array for iteration (works with ES5 target)
    const keysArray = Array.from(allKeys)
    for (const key of keysArray) {
      const prevValue = prevProps[key]
      const nextValue = props[key]

      const referenceChanged = prevValue !== nextValue
      const contentChanged = !contentEquals(prevValue, nextValue)

      if (referenceChanged || contentChanged) {
        hasReferenceChanges ||= referenceChanged
        hasContentChanges ||= contentChanged

        propChangesRef.current.push({
          prop: key,
          changed: true,
          referenceChanged,
          contentChanged,
          prevValue,
          nextValue,
        })
      }
    }

    // Log if there are changes or if logging everything
    if ((logOnlyChanges && propChangesRef.current.length > 0) || !logOnlyChanges) {
      if (logToConsole) {
        const changes = propChangesRef.current
          .map((c) => {
            const flags = []
            if (c.referenceChanged) flags.push('REF')
            if (c.contentChanged && !c.referenceChanged) flags.push('CONTENT')
            return `${c.prop} (${flags.join(',')})`
          })
          .join(', ')

        log.debug(`RenderDiagnostics:${componentName}`, `Render #${currentRender}`, {
          changes: changes || 'none',
          propCount: propChangesRef.current.length,
        })
      }
    }

    // Store current props for next render
    prevPropsRef.current = { ...props }
  })

  return {
    renderCount: currentRender,
    propChanges: propChangesRef.current,
    hasReferenceChanges: propChangesRef.current.some((c) => c.referenceChanged),
    hasContentChanges: propChangesRef.current.some((c) => c.contentChanged),
  }
}
