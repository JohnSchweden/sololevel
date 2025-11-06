/// <reference types="@welldone-software/why-did-you-render" />

/**
 * why-did-you-render setup for React 19
 *
 * Enhanced configuration for detailed root cause analysis
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
 * @see http://bit.ly/wdyr3 (hook tracking details)
 */

import React from 'react'

if (process.env.NODE_ENV === 'development') {
  const whyDidYouRender = require('@welldone-software/why-did-you-render')
  whyDidYouRender(React, {
    // Track all memoized components automatically
    trackAllPureComponents: true,

    // Track hook changes (useState, useMemo, useCallback, etc.)
    trackHooks: true,

    // Track additional custom hooks (add your custom hooks here)
    trackExtraHooks: [
      // Example: [useQuery, useMutation] from TanStack Query
      // Add any custom hooks you want to track
    ],

    // Log ALL re-renders, even when props/state actually changed (not just unnecessary ones)
    // This helps identify cascading re-renders and mount performance issues
    logOnDifferentValues: true,

    // Show why parent components re-rendered (helps trace re-render chains)
    logOwnerReasons: true,

    // Show full prop/state diff paths (more detailed than default)
    // 0 = minimal, 1 = normal, 2 = detailed paths
    diffNameLevel: 2,

    // Don't collapse log groups - keep everything visible for debugging
    collapseGroups: false,

    // Custom notifier for detailed root cause analysis
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    notifier: (updateInfo: any) => {
      const {
        Component,
        displayName,
        hookName,
        prevHookResult,
        nextHookResult,
        reason,
        ownerDataMap,
      } = updateInfo

      const componentName = displayName || Component?.displayName || Component?.name || 'Unknown'
      const title = hookName ? `${componentName}.${hookName}` : componentName

      // Log detailed hook differences
      if (reason?.hookDifferences) {
        console.group(`%c${title}`, 'background-color: white;color: #058;')
        console.log('Re-rendered because of hook changes:')

        // Also check if component is being unmounted/remounted
        if (prevHookResult === undefined && nextHookResult === undefined) {
          console.log(
            '%c⚠️ Both prev and next hook results are undefined - possible unmount/remount',
            'color: red;'
          )
        }

        Object.entries(reason.hookDifferences).forEach(([hookIndex, diff]: [string, any]) => {
          console.group(
            `%c[hook useState result]%c%c`,
            'background-color: white;color:blue;',
            'background-color: white;color:red;',
            'background-color: white;color:default;'
          )
          console.log('different objects. (more info at http://bit.ly/wdyr3)')

          // WDYR provides prevValue and nextValue, not prev and next
          const prevValue = diff.prevValue
          const nextValue = diff.nextValue

          console.log('Hook index:', hookIndex)
          console.log('State value changed:', { prev: prevValue, next: nextValue })

          if (diff.pathString) {
            console.log('Path:', diff.pathString)
          }

          // Check if state value actually changed
          if (prevValue !== nextValue) {
            console.log('%c✓ State value changed (legitimate re-render)', 'color: green;')

            // For useState hooks, identify which state changed
            if (hookIndex === '0') {
              console.log(
                'This is the first useState hook (notificationSheetOpen or videoSettingsSheetOpen)'
              )
            }
          } else {
            console.log('%c⚠️ Hook result recreated but state value unchanged', 'color: orange;')
          }

          // Check if it's a reference change (same content, different object)
          // This is mainly for objects/arrays, not primitives like boolean
          if (
            typeof prevValue === 'object' &&
            typeof nextValue === 'object' &&
            prevValue !== null &&
            nextValue !== null
          ) {
            const isReferenceChange = JSON.stringify(prevValue) === JSON.stringify(nextValue)
            if (isReferenceChange) {
              console.log(
                '%c⚠️ Reference change detected (same content, different object)',
                'color: orange;'
              )
            }
          }

          console.groupEnd()
        })
        console.groupEnd()
      }

      // Log prop differences with detailed info
      if (reason?.propsDifferences) {
        console.group(`%c${title}`, 'background-color: white;color: #058;')
        console.log('Re-rendered because of prop changes:')
        Object.entries(reason.propsDifferences).forEach(([propName, diff]: [string, any]) => {
          console.log(`%c${propName}:`, 'color: red;', {
            prev: diff.prev,
            next: diff.next,
            ...(diff.path && { path: diff.path }),
          })
          // Check if it's a reference change
          const isReferenceChange =
            diff.prev !== diff.next && JSON.stringify(diff.prev) === JSON.stringify(diff.next)
          if (isReferenceChange) {
            console.log(
              `%c  ⚠️ ${propName} is a reference change (same content, different object)`,
              'color: orange;'
            )
          }
        })
        console.groupEnd()
      }

      // Log state differences
      if (reason?.stateDifferences) {
        console.group(`%c${title}`, 'background-color: white;color: #058;')
        console.log('Re-rendered because of state changes:')
        Object.entries(reason.stateDifferences).forEach(([stateKey, diff]: [string, any]) => {
          console.log(`%cstate.${stateKey}:`, 'color: red;', {
            prev: diff.prev,
            next: diff.next,
            ...(diff.path && { path: diff.path }),
          })
        })
        console.groupEnd()
      }

      // Log owner (parent) re-render reasons - critical for tracing cascades
      if (ownerDataMap && ownerDataMap.size > 0) {
        console.group(`%c${title}`, 'background-color: white;color: #058;')
        console.log('Parent component(s) re-rendered:')
        ownerDataMap.forEach((ownerData: any, owner: any) => {
          const ownerName = owner?.displayName || owner?.name || 'Unknown'
          console.log(`%cOwner: ${ownerName}`, 'color: purple;')
          if (ownerData && typeof ownerData === 'object') {
            console.log('Owner re-render reason:', ownerData)
          }
        })
        console.groupEnd()
      }
    },

    // Exclude noisy components that break navigation or are too verbose
    exclude: [
      /^Screen$/, // Expo Router Screen components
      /^Stack$/, // Expo Router Stack
      /^Group$/, // Expo Router Group
      /^WDYR.*$/, // why-did-you-render internal wrappers
      /^Suspense$/, // React Suspense
    ],
  })
}
