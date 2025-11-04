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

    // Custom notifier that uses our logger instead of console.group (which doesn't work well in RN)
    // Note: why-did-you-render passes arguments differently - using rest parameters to catch all
    const customNotifier = (...args: any[]) => {
      // Direct console.log to verify notifier is called (debug logs might be filtered)
      console.log('🔍 [WDYR] Notifier called!', {
        argsCount: args.length,
        firstArgKeys:
          args[0] && typeof args[0] === 'object' ? Object.keys(args[0]) : typeof args[0],
      })

      // Log raw args first to debug
      log.debug('why-did-you-render', 'Notifier called', {
        argsCount: args.length,
        firstArg: args[0] ? Object.keys(args[0]) : 'no args',
      })

      // why-did-you-render passes an object with updateInfo
      const updateInfo = args[0]
      if (!updateInfo) {
        log.warn('why-did-you-render', 'Notifier called without updateInfo')
        return
      }

      const {
        Component,
        displayName,
        hookName,
        prevProps,
        prevState: _prevState,
        prevHookResult: _prevHookResult,
        nextProps,
        nextState: _nextState,
        nextHookResult: _nextHookResult,
        reason,
        ownerDataMap,
      } = updateInfo

      const componentName = displayName || Component?.displayName || Component?.name || 'Unknown'
      const title = hookName ? `${componentName}.${hookName}` : componentName

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
              changes.push(`props.${key}`)
              propDetails[key] = {
                prev: (diff as any)?.prevValue,
                next: (diff as any)?.nextValue,
                path: (diff as any)?.path,
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

      log.warn('why-did-you-render', `🔍 ${title} re-rendered${changesText}`, context)
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
