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
    // Track ONLY manually flagged components (reduces mount overhead)
    trackAllPureComponents: false,

    // Track hook changes to see setState cascades
    trackHooks: true,

    // Log ALL re-renders (not just wasteful ones) to measure frequency
    logOnDifferentValues: false,

    // Show parent component re-render chains
    logOwnerReasons: true,

    // Keep log groups expanded for debugging
    collapseGroups: false,

    // Exclude Expo Router and system components
    exclude: [/^Screen$/, /^Stack$/, /^Group$/, /^WDYR.*$/, /^Suspense$/],
  })
}
