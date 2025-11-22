module.exports = (api) => {
  api.cache(true)
  return {
    presets: [
      [
        'babel-preset-expo',
        {
          jsxRuntime: 'automatic',
          reanimated: false,
          // Enable source maps for better wdyr hook name visibility
          //jsxImportSource: process.env.NODE_ENV === 'development' ? '@welldone-software/why-did-you-render' : undefined,
        },
      ],
    ],
    plugins: [
      [
        require.resolve('babel-plugin-module-resolver'),
        {
          root: ['../..'],
          alias: {
            // define aliases to shorten the import paths
            app: '../../packages/app',
            '@my/ui': '../../packages/ui',
            '@my/config': '../../packages/config/src',
          },
          extensions: ['.js', '.jsx', '.tsx', '.ios.js', '.android.js'],
        },
      ],
      // if you want reanimated support
      [
        '@tamagui/babel-plugin',
        {
          components: ['@my/ui', 'tamagui'],
          config: '../../packages/config/src/tamagui.config.ts',
          logTimings: true,
          disableExtraction: false,
        },
      ],
      // POST-MVP: react-native-worklets-core/plugin removed (pose detection feature)
      'react-native-reanimated/plugin',
    ],
  }
}
