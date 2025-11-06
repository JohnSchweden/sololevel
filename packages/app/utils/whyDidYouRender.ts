/// <reference types="@welldone-software/why-did-you-render" />

/**
 * why-did-you-render setup for React 19
 *
 * This tool helps identify unnecessary re-renders by logging when components
 * render with the same props/state/hooks. Primarily useful for web development.
 *
 * For React Native, prefer using `useRenderDiagnostics` hook instead.
 *
 * Usage:
 * 1. Import this file in your app entry point (dev only)
 * 2. Enable on specific components: `Component.whyDidYouRender = true`
 *
 * @see https://github.com/welldone-software/why-did-you-render
 */

import { log } from '@my/logging'
import React from 'react'

// Only enable in development
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isDev = (globalThis as any).__DEV__ !== false && process.env.NODE_ENV !== 'production'

if (isDev) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const whyDidYouRender = require('@welldone-software/why-did-you-render')

    // Minimal setup - uses default console output
    whyDidYouRender(React, {
      trackAllPureComponents: false, // Only track manually enabled components
    })

    log.info('why-did-you-render', '✅ Initialized successfully')

    /* COMMENTED OUT: Custom notifier with deduplication and React Native logging
    // Deduplication cache to prevent duplicate notifications for the same update
    // Maps component+hook signature to timestamp
    // Use a closure to ensure cache is shared across all notifier calls
    const notificationCache = new Map<string, number>()
    const DEDUP_WINDOW_MS = 50 // Skip duplicates within 50ms

    // Use a Set to track in-flight notifications (same dedup key being processed)
    // This prevents race conditions when multiple notifications arrive synchronously
    const inFlightNotifications = new Set<string>()

    // Custom notifier that uses our logger instead of console.group (which doesn't work well in RN)
    // Note: why-did-you-render passes arguments differently - using rest parameters to catch all
    const customNotifier = (...args: any[]) => {
      // why-did-you-render passes an object with updateInfo
      const updateInfo = args[0]
      if (!updateInfo) {
        log.warn('why-did-you-render', 'Notifier called without updateInfo')
        return
      }

      const { Component, displayName, hookName, reason: reasonInfo } = updateInfo

      const componentName = displayName || Component?.displayName || Component?.name || 'Unknown'
      const title = hookName ? `${componentName}.${hookName}` : componentName

      // Extract hook change signature for deduplication
      // Build a stable signature from the hook differences to identify duplicate notifications
      let hookSignature = ''

      // Check hookDifferences in reasonInfo (works for both hook-level and component-level renders)
      if (reasonInfo?.hookDifferences && Object.keys(reasonInfo.hookDifferences).length > 0) {
        const hookDiffs = reasonInfo.hookDifferences
        const entries = Object.entries(hookDiffs)

        if (entries.length > 0) {
          // For hook-level renders (hookName exists), use first difference
          // For component-level renders, use all differences (limit to 3 to avoid huge keys)
          const limit = hookName ? 1 : 3
          const entriesToUse = entries.slice(0, limit)

          hookSignature = entriesToUse
            .map(([hookKey, diff]: [string, any]) => {
              // Extract prev/next values - handle both diff formats
              const prevVal = diff?.prev ?? diff?.prevValue ?? diff?.prevState
              const nextVal = diff?.next ?? diff?.nextValue ?? diff?.nextState
              // Use simple string representation for primitives, "obj" for objects
              const prevStr =
                typeof prevVal === 'object' && prevVal !== null ? 'obj' : String(prevVal)
              const nextStr =
                typeof nextVal === 'object' && nextVal !== null ? 'obj' : String(nextVal)
              return `${hookKey}:${prevStr}→${nextStr}`
            })
            .join(',')
        }
      }

      // Create deduplication key: component+hook+signature
      // hookSignature already includes hook index (format: "index:prev→next")
      // So we just combine title + signature
      const now = Date.now()
      const dedupKey = hookSignature ? `${title}:${hookSignature}` : `${title}:${now}` // Fallback: use timestamp if no signature

      // CRITICAL: Check both cache AND in-flight set to prevent synchronous duplicates
      // If another call is processing the same key right now, skip this one
      if (inFlightNotifications.has(dedupKey)) {
        // Another notification with the same key is being processed - skip this duplicate
        return
      }

      const lastNotification = notificationCache.get(dedupKey)

      // Skip if we've seen this exact notification recently
      // Use <= instead of < to handle same-timestamp duplicates (synchronous calls)
      if (lastNotification !== undefined && now - lastNotification <= DEDUP_WINDOW_MS) {
        // Duplicate within dedup window - skip silently
        // This prevents duplicate notifications when WDYR fires multiple times for the same update
        return
      }

      // Mark as in-flight BEFORE any async operations to prevent race conditions
      // This ensures synchronous duplicate calls see the in-flight flag immediately
      inFlightNotifications.add(dedupKey)

      // Update cache BEFORE logging to prevent race conditions with synchronous duplicates
      // This ensures the second call (same timestamp) sees the updated cache
      notificationCache.set(dedupKey, now)

      // Remove from in-flight set after a short delay to allow synchronous duplicates to see it
      // Use setTimeout(0) to defer removal until after current synchronous execution completes
      setTimeout(() => {
        inFlightNotifications.delete(dedupKey)
      }, 0)

      // Clean up old cache entries (older than 1 second)
      if (notificationCache.size > 100) {
        const oneSecondAgo = now - 1000
        for (const [key, timestamp] of notificationCache.entries()) {
          if (timestamp < oneSecondAgo) {
            notificationCache.delete(key)
          }
        }
      }

      // Log raw args for debugging
      log.debug('why-did-you-render', 'Notifier called', {
        argsCount: args.length,
        firstArg: args[0] ? Object.keys(args[0]) : 'no args',
      })

      const {
        prevProps,
        prevState: _prevState,
        prevHookResult: _prevHookResult,
        nextProps,
        nextState: _nextState,
        nextHookResult: _nextHookResult,
        reason,
        ownerDataMap,
      } = updateInfo

      // Build a readable message from reason object
      const changes: string[] = []
      const hookDetails: Record<string, unknown> = {}
      const propDetails: Record<string, unknown> = {}
      const stateDetails: Record<string, unknown> = {}

      // Track if this is a component-level render (no hookName) vs hook-level render
      const isComponentLevel = !hookName

      // Handle different reason structures (why-did-you-render has inconsistent API)
      if (reason) {
        if (typeof reason === 'object') {
          if (reason.propsDifferences) {
            Object.entries(reason.propsDifferences).forEach(([key, diff]) => {
              const diffObj = diff as any
              const prevVal = diffObj?.prevValue ?? diffObj?.prev
              const nextVal = diffObj?.nextValue ?? diffObj?.next

              // Format values for readability
              const formatValue = (val: unknown): string => {
                if (val === null) return 'null'
                if (val === undefined) return 'undefined'
                if (typeof val === 'function') return 'function'
                if (typeof val === 'object') {
                  const str = JSON.stringify(val)
                  return str.length > 50 ? `${str.slice(0, 50)}...` : str
                }
                return String(val)
              }

              changes.push(`props.${key}`)
              propDetails[key] = {
                prev: formatValue(prevVal),
                next: formatValue(nextVal),
                path: diffObj?.path,
                isReferenceChange:
                  prevVal !== nextVal && JSON.stringify(prevVal) === JSON.stringify(nextVal),
              }
            })
          }

          if (reason.stateDifferences) {
            Object.entries(reason.stateDifferences).forEach(([key, diff]) => {
              changes.push(`state.${key}`)
              stateDetails[key] = {
                prev: (diff as any)?.prevValue,
                next: (diff as any)?.nextValue,
                path: (diff as any)?.path,
              }
            })
          }

          if (reason.hookDifferences) {
            Object.entries(reason.hookDifferences).forEach(([key, diff]) => {
              const hookIndex = Number.parseInt(key, 10)
              const hookDisplayName = hookName || `hook[${hookIndex}]`
              changes.push(hookDisplayName)

              // Extract hook value details if available
              const diffObj = diff as any
              hookDetails[hookDisplayName] = {
                index: hookIndex,
                prev: diffObj?.prevValue ?? diffObj?.prev,
                next: diffObj?.nextValue ?? diffObj?.next,
                path: diffObj?.path,
                // Check if it's a reference change
                isReferenceChange:
                  diffObj?.prev !== diffObj?.next &&
                  JSON.stringify(diffObj?.prev) === JSON.stringify(diffObj?.next),
              }
            })
          }

          // Check owner differences (parent re-rendered)
          if (reason.ownerDifferences) {
            changes.push('owner changed')
          }

          if (reason.diffPath) {
            changes.push(reason.diffPath)
          }

          // If it's an object with keys, try to extract them
          if (changes.length === 0 && Object.keys(reason).length > 0) {
            changes.push(...Object.keys(reason).slice(0, 5)) // Limit to avoid spam
          }
        } else if (typeof reason === 'string') {
          changes.push(reason)
        }
      }

      // For component-level renders with no changes, explicitly mark as spurious
      const changesText =
        changes.length > 0
          ? ` — ${changes.join(', ')}`
          : isComponentLevel
            ? ' — ⚠️ SPURIOUS: no prop/state/hook changes detected'
            : ' — same props/state (unnecessary re-render)'

      // Build detailed context
      const context: Record<string, unknown> = {
        componentName: title,
        reasonType: typeof reason,
        reasonKeys: reason && typeof reason === 'object' ? Object.keys(reason) : [],
        prevPropsKeys: prevProps ? Object.keys(prevProps).slice(0, 10) : [],
        nextPropsKeys: nextProps ? Object.keys(nextProps).slice(0, 10) : [],
        hasOwnerData: ownerDataMap && ownerDataMap.size > 0,
      }

      // Add detailed differences if available
      if (Object.keys(hookDetails).length > 0) {
        context.hookDifferences = hookDetails
      }
      if (Object.keys(propDetails).length > 0) {
        context.propDifferences = propDetails
      }
      if (Object.keys(stateDetails).length > 0) {
        context.stateDifferences = stateDetails
      }

      // Add owner info if available
      if (ownerDataMap && ownerDataMap.size > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const entries = Array.from((ownerDataMap as any).entries()) as [any, any][]
        context.ownerInfo = entries.map(([owner, data]) => {
          return {
            owner: owner?.displayName || owner?.name || 'Unknown',
            data: data && typeof data === 'object' ? Object.keys(data).slice(0, 5) : [],
          }
        })
      }

      // Use debug level for enabled components with legit changes
      // Use warn level for spurious renders (unnecessary re-renders)
      const isSpurious =
        changes.length === 0 || (changes.length === 1 && changes[0] === 'owner changed')
      const logLevel = isSpurious ? 'warn' : 'debug'

      // Add timestamp for cascade tracking
      context.timestamp = Date.now()
      context.timestampMs = new Date().toISOString()

      log[logLevel]('why-did-you-render', `🔍 ${title} re-rendered${changesText}`, context)
    }

    whyDidYouRender(React, {
      // Track only manually enabled components (not all)
      trackAllPureComponents: false,

      // Log when props/state changed (even if legit) - allow component-level override
      logOnDifferentValues: false, // Global default - components can override with logOnDifferentValues: true

      // Include hook changes in logs
      trackHooks: true,

      // Log owner changes to trace re-render causes
      logOwnerReasons: true,

      // Track custom hooks
      trackExtraHooks: [
        // Add any custom hooks you want to track
      ],

      // Use custom notifier for React Native compatibility
      notifier: customNotifier,

      // Collapse groups for cleaner console (not used with custom notifier but kept for consistency)
      collapseGroups: false,

      // Exclude Expo Router and React Native internals that break navigation
      include: null, // Only track manually enabled components
      exclude: [
        /^Suspense$/,
        /^Internal.*$/,
        /^WDYR.*$/, // why-did-you-render internal wrappers
        /^Screen$/, // Expo Router Screen components
        /^Stack$/, // Expo Router Stack
        /^Group$/, // Expo Router Group
        /^RootLayoutNav$/, // App root layout
        /^RNCSafeAreaProvider$/, // React Native Safe Area
        /^ErrorBoundary$/, // Error boundaries
        /^Provider$/, // Our Provider wrapper
        /^QueryProvider$/, // TanStack Query provider
        /^I18nProvider$/, // i18n provider
        /^TamaguiProvider$/, // Tamagui provider
      ],
    })

    // Log successful initialization for verification
    log.info(
      'why-did-you-render',
      '✅ Initialized successfully - tracking manually enabled components'
    )
    */
  } catch (error) {
    // Gracefully fail if package not installed
    if (error instanceof Error && error.message.includes('Cannot find module')) {
      log.warn(
        'why-did-you-render',
        'Package not installed. Run: yarn add -D @welldone-software/why-did-you-render'
      )
    } else {
      log.error('why-did-you-render', 'Setup error', { error })
    }
  }
}

// Type augmentation for component static property
// Note: why-did-you-render adds this property, so we just document it
// The library handles the actual augmentation
