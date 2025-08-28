/** @type {import('next').NextConfig} */
const { withTamagui } = require('@tamagui/next-plugin')
const { join } = require('node:path')
const { i18n } = require('./next-i18next.config')
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

const boolVals = {
  true: true,
  false: false,
}

const disableExtraction =
  boolVals[process.env.DISABLE_EXTRACTION] ?? process.env.NODE_ENV === 'development'

const plugins = [
  withBundleAnalyzer,
  withTamagui({
    config: '../../packages/config/src/tamagui.config.ts',
    components: ['tamagui', '@my/ui'],
    appDir: true,
    importsWhitelist: ['constants.js', 'colors.js'],
    outputCSS: process.env.NODE_ENV === 'production' ? './public/tamagui.css' : null,
    logTimings: false,
    disableExtraction,
    shouldExtract: (path) => {
      if (path.includes(join('packages', 'app'))) {
        return true
      }
    },
    disableThemesBundleOptimize: true,
    excludeReactNativeWebExports: ['Switch', 'ProgressBar', 'Picker', 'CheckBox', 'Touchable'],
  }),
]

module.exports = () => {
  /** @type {import('next').NextConfig} */
  let config = {
    i18n,
    transpilePackages: [
      'react-native-web',
      'expo-linking',
      'expo-constants',
      'expo-modules-core',
      'expo-camera',
      'expo-av',
      'expo-media-library',
      '@expo/vector-icons',
    ],
    experimental: {
      scrollRestoration: true,
    },
    compiler: {
      styledJsx: false,
    },
    eslint: {
      ignoreDuringBuilds: true,
    },
    webpack: (config, { isServer }) => {
      // Handle React Native modules
      config.resolve.alias = {
        ...(config.resolve.alias || {}),
        // React Native Web aliases
        'react-native$': 'react-native-web',
        // Mock expo-camera for web builds since it's only used with dynamic imports
        'expo-camera': false,
      }

      // Add support for React Native file extensions
      config.resolve.extensions = [
        '.web.js',
        '.web.jsx',
        '.web.ts',
        '.web.tsx',
        ...config.resolve.extensions,
      ]

      // Ignore expo modules that are only used on native
      config.externals = config.externals || []
      if (!isServer) {
        config.externals.push({
          'expo-camera': 'expo-camera',
          'expo-av': 'expo-av',
          'expo-media-library': 'expo-media-library',
        })
      }

      return config
    },
  }

  for (const plugin of plugins) {
    config = {
      ...config,
      ...plugin(config),
    }
  }

  return config
}
