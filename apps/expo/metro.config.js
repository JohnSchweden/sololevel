// Learn more https://docs.expo.dev/guides/monorepos
// Learn more https://docs.expo.io/guides/customizing-metro
/**
 * @type {import('expo/metro-config')}
 */
const { getDefaultConfig } = require('@expo/metro-config')
const path = require('node:path')

const projectRoot = __dirname
const workspaceRoot = path.resolve(projectRoot, '../..')

const config = getDefaultConfig(projectRoot)

// 1. Watch all files within the monorepo
config.watchFolders = [workspaceRoot]
// 2. Let Metro know where to resolve packages and in what order
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
]
// 3. Force Metro to resolve (sub)dependencies only from the `nodeModulesPaths`
config.resolver.disableHierarchicalLookup = true

config.transformer = {
  ...config.transformer,
  unstable_allowRequireContext: true,
}

// Add debugging for module resolution
config.resolver.resolverMainFields = ['react-native', 'browser', 'main']
config.resolver.platforms = ['native', 'ios', 'android', 'web']

// Debug module resolution
const originalResolveRequest = config.resolver.resolveRequest
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.includes('useMVPPoseDetection')) {
    console.log('🔍 METRO DEBUG: Resolving module:', moduleName, 'from:', context.originModulePath)
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform)
  }
  return context.resolveRequest(context, moduleName, platform)
}
config.transformer.minifierPath = require.resolve('metro-minify-terser')

// Add extra node modules resolution for TensorFlow.js and React 19 compatibility
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  '@mediapipe/pose': require.resolve('@mediapipe/pose', {
    paths: [path.resolve(projectRoot, 'node_modules')],
  }),
  // React 19 + Hermes compatibility
  'react': path.resolve(workspaceRoot, 'node_modules/react'),
  'react-native': path.resolve(workspaceRoot, 'node_modules/react-native'),
}

// React 19 + Hermes compatibility: ensure consistent React resolution
config.resolver.alias = {
  ...config.resolver.alias,
  'react': path.resolve(workspaceRoot, 'node_modules/react'),
  'react-native': path.resolve(workspaceRoot, 'node_modules/react-native'),
}

module.exports = config
