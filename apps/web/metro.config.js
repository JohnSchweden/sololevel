const { getDefaultConfig } = require('@expo/metro-config')
const path = require('node:path')

// Load environment variables from .env files before Metro starts
// This makes them available to the bundler
require('dotenv').config({ path: path.resolve(__dirname, '.env.local') })
require('dotenv').config({ path: path.resolve(__dirname, '.env') })

const projectRoot = __dirname
const workspaceRoot = path.resolve(projectRoot, '../..')

const config = getDefaultConfig(projectRoot)

// 1. Watch all files within the monorepo (critical for resolving assets from apps/expo/assets/)
config.watchFolders = [workspaceRoot]

// Add web support
config.resolver.platforms = ['ios', 'android', 'native', 'web']

// 2. Let Metro know where to resolve packages and in what order
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
]

// 3. Force Metro to resolve (sub)dependencies only from the `nodeModulesPaths`
config.resolver.disableHierarchicalLookup = true

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

module.exports = config
