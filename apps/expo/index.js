// Minimal safe boot guard for Hermes + React 19 in dev
import React from 'react'
try {
  // eslint-disable-next-line no-undef
  global.React = React
  // eslint-disable-next-line camelcase
  const internals =
    React && React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED
      ? React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED
      : (React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = {})
  if (!internals.ReactCurrentOwner) internals.ReactCurrentOwner = { current: null }
} catch {}

// Initialize why-did-you-render for render cascade debugging (dev only)
// Note: Imported in _layout.tsx instead due to path alias resolution

// Expo Router entry
import 'expo-router/entry'
