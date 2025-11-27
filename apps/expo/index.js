// Suppress Reanimated strict mode warnings caused by WDYR hook wrapping
import { ReanimatedLogLevel, configureReanimatedLogger } from 'react-native-reanimated'
if (__DEV__) {
  configureReanimatedLogger({
    level: ReanimatedLogLevel.warn,
    strict: false, // Disable strict mode warnings
  })
}

// why-did-you-render setup - must be imported after Reanimated config
//import './wdyr'

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

// Expo Router entry
import 'expo-router/entry'
