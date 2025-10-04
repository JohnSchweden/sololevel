import '@testing-library/jest-dom'

// Suppress react-test-renderer deprecation warnings in React 19
// This is a known issue with @testing-library/react-native until they update
const originalConsoleError = console.error
console.error = (...args) => {
  if (typeof args[0] === 'string') {
    // Suppress react-test-renderer deprecation warnings
    if (args[0].includes('react-test-renderer is deprecated')) {
      return // Suppress this specific warning
    }
    // Suppress React Native style prop warnings in web tests
    if (
      args[0].includes('React does not recognize the') &&
      (args[0].includes('justifyContent') ||
        args[0].includes('alignItems') ||
        args[0].includes('borderWidth') ||
        args[0].includes('borderColor') ||
        args[0].includes('borderRadius') ||
        args[0].includes('borderTopColor') ||
        args[0].includes('backgroundColor') ||
        args[0].includes('marginTop') ||
        args[0].includes('resizeMode') ||
        args[0].includes('testID') ||
        args[0].includes('accessibilityHint') ||
        args[0].includes('shadowColor') ||
        args[0].includes('shadowOffset') ||
        args[0].includes('shadowOpacity') ||
        args[0].includes('shadowRadius') ||
        args[0].includes('paddingHorizontal') ||
        args[0].includes('textAlign') ||
        args[0].includes('numberOfLines') ||
        args[0].includes('playInBackground') ||
        args[0].includes('playWhenInactive') ||
        args[0].includes('ignoreSilentSwitch') ||
        args[0].includes('onLayout') ||
        args[0].includes('accessibilityLabel') ||
        args[0].includes('accessibilityRole') ||
        args[0].includes('accessibilityValue') ||
        args[0].includes('accessibilityHint'))
    ) {
      return // Suppress React Native style prop warnings
    }
    // Suppress event handler warnings
    if (
      args[0].includes('Unknown event handler property') &&
      (args[0].includes('onPressIn') ||
        args[0].includes('onPressOut') ||
        args[0].includes('onEnd') ||
        args[0].includes('onStartShouldSetPanResponder') ||
        args[0].includes('onMoveShouldSetPanResponder') ||
        args[0].includes('onPanResponderGrant') ||
        args[0].includes('onPanResponderMove') ||
        args[0].includes('onPanResponderRelease') ||
        args[0].includes('onPanResponderTerminate'))
    ) {
      return // Suppress unknown event handler warnings
    }
    // Suppress View component casing warnings
    if (args[0].includes('is using incorrect casing') && args[0].includes('View')) {
      return // Suppress View casing warnings
    }
    // Suppress unrecognized tag warnings
    if (args[0].includes('is unrecognized in this browser') && args[0].includes('View')) {
      return // Suppress View tag warnings
    }
  }
  originalConsoleError(...args)
}

// All component mocks and polyfills are now handled by:
// - jest.polyfills.js (environment polyfills)
// - src/test-utils/setup.ts (component mocks and test utilities)
