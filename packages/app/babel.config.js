module.exports = {
  presets: [['babel-preset-expo', { jsxRuntime: 'automatic', reanimated: false }]],
  plugins: [
    // Minimal plugins for testing - no worklets, no module resolver
  ],
}
