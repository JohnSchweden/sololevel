const { getDefaultConfig } = require('@expo/metro-config')
const path = require('node:path')

// Load environment variables from .env files before Metro starts
// This makes them available to the bundler
require('dotenv').config({ path: path.resolve(__dirname, '.env.local') })
require('dotenv').config({ path: path.resolve(__dirname, '.env') })

const config = getDefaultConfig(__dirname)

// Add web support
config.resolver.platforms = ['ios', 'android', 'native', 'web']

// Add path aliases
config.resolver.alias = {
  '@my/ui': '../../packages/ui/src',
  '@my/config': '../../packages/config/src',
  app: '../../packages/app',
}

// Force CommonJS version of zustand to avoid import.meta issues
config.resolver.resolverMainFields = ['react-native', 'browser', 'main']

// Transform zustand to fix import.meta.env issues
config.transformer = {
  ...config.transformer,
  unstable_allowRequireContext: true,
}

// Configure transformerPath to use Babel for node_modules/zustand
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
  path.resolve(__dirname, '../../node_modules'),
]

module.exports = config
