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

// 4. Blocklist test directories and production-only files to prevent bundling
// Note: Patterns must NOT match files in node_modules to avoid breaking dependencies
config.resolver.blockList = [
  // Block test directories (excluding node_modules)
  /^(?!.*node_modules).*\/__tests__\/.*/,
  /^(?!.*node_modules).*\/test-utils\/.*/,
  /^(?!.*node_modules).*\.test\.(ts|tsx|js|jsx)$/,
  /^(?!.*node_modules).*\.spec\.(ts|tsx|js|jsx)$/,

  // Block production-only files from project packages (not from node_modules)
  // These are excluded from MVP and should not be bundled
  new RegExp(`${path.resolve(workspaceRoot, 'packages')}.*\/usePoseMetrics\.ts$`),
  new RegExp(`${path.resolve(workspaceRoot, 'packages')}.*\/usePoseState\.ts$`),
  new RegExp(`${path.resolve(workspaceRoot, 'packages')}.*\/poseConfigManager\.ts$`),
  new RegExp(`${path.resolve(workspaceRoot, 'packages')}.*\/poseStateIntegrationTest\.ts$`),
  new RegExp(`${path.resolve(workspaceRoot, 'packages')}.*\/poseStatePersistence\.ts$`),
  new RegExp(`${path.resolve(workspaceRoot, 'packages')}.*\/storeEnhancementMigration\.ts$`),
  new RegExp(`${path.resolve(workspaceRoot, 'packages')}.*\/cameraRecordingEnhanced\.ts$`),
  new RegExp(`${path.resolve(workspaceRoot, 'packages')}.*\/enhancedCameraStore\.ts$`),
  new RegExp(`${path.resolve(workspaceRoot, 'packages')}.*\/performanceStore\.ts$`),
  new RegExp(`${path.resolve(workspaceRoot, 'packages')}.*\/useAdaptiveQuality\.ts$`),
  new RegExp(`${path.resolve(workspaceRoot, 'packages')}.*\/useEnhancedZoom\.ts$`),
  new RegExp(`${path.resolve(workspaceRoot, 'packages')}.*\/useEnhancedCameraSwap\.ts$`),
  new RegExp(`${path.resolve(workspaceRoot, 'packages')}.*\/useThermalMonitoring\.native\.ts$`),
  new RegExp(`${path.resolve(workspaceRoot, 'packages')}.*\/useFrameProcessing\.ts$`),
  new RegExp(`${path.resolve(workspaceRoot, 'packages')}.*\/useFrameProcessor\.native\.ts$`),
  new RegExp(`${path.resolve(workspaceRoot, 'packages')}.*\/useCameraFrameProcessor\.web\.ts$`),
  new RegExp(`${path.resolve(workspaceRoot, 'packages')}.*\/usePoseDetection\.native\.ts$`),
  new RegExp(`${path.resolve(workspaceRoot, 'packages')}.*\/usePoseDetection\.web\.ts$`),
  new RegExp(`${path.resolve(workspaceRoot, 'packages')}.*\/poseProcessing\.native\.ts$`),
  new RegExp(`${path.resolve(workspaceRoot, 'packages')}.*\/poseDetection\.web\.ts$`),
  new RegExp(`${path.resolve(workspaceRoot, 'packages')}.*\/PerformanceMonitor\.tsx$`),
  new RegExp(`${path.resolve(workspaceRoot, 'packages')}.*\/ThermalIndicator\.tsx$`),
  new RegExp(`${path.resolve(workspaceRoot, 'packages')}.*\/pose\.ts$`),
  new RegExp(`${path.resolve(workspaceRoot, 'packages')}.*\/enhanced-state\.ts$`),
  new RegExp(`${path.resolve(workspaceRoot, 'packages')}.*\/performance\.ts$`),
  new RegExp(`${path.resolve(workspaceRoot, 'packages')}.*\/thermal\.ts$`),
  new RegExp(`${path.resolve(workspaceRoot, 'packages')}.*\/cross-platform-state\.ts$`),
  new RegExp(`${path.resolve(workspaceRoot, 'packages')}.*\/poseDetectionConfig\.ts$`),
  new RegExp(`${path.resolve(workspaceRoot, 'packages')}.*\/poseDataBuffer\.ts$`),
  new RegExp(`${path.resolve(workspaceRoot, 'packages')}.*\/poseDataExport\.ts$`),
  new RegExp(`${path.resolve(workspaceRoot, 'packages')}.*\/poseDataValidation\.ts$`),
  new RegExp(`${path.resolve(workspaceRoot, 'packages')}.*\/poseThermalIntegration\.ts$`),
  new RegExp(`${path.resolve(workspaceRoot, 'packages')}.*\/storeMigration\.ts$`),
  new RegExp(`${path.resolve(workspaceRoot, 'packages')}.*\/cameraRecording\.ts\.backup\.prod$`),
  new RegExp(
    `${path.resolve(workspaceRoot, 'packages')}.*\/useCameraPermissions\.native\.ts\.backup\.prod$`
  ),
  new RegExp(
    `${path.resolve(workspaceRoot, 'packages')}.*\/useCameraScreenLogic\.ts\.backup\.prod$`
  ),
  new RegExp(
    `${path.resolve(workspaceRoot, 'packages')}.*\/useRecordingStateMachine\.ts\.backup\.prod$`
  ),
  new RegExp(`${path.resolve(workspaceRoot, 'packages')}.*\/poseStore\.ts$`),
]

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
    // Uncomment for Metro debugging (uses console for build-time logging)
    // console.log('🔍 METRO DEBUG: Resolving module:', moduleName, 'from:', context.originModulePath)
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform)
  }
  return context.resolveRequest(context, moduleName, platform)
}
config.transformer.minifierPath = require.resolve('metro-minify-terser')

// Add extra node modules resolution for React 19 compatibility
// POST-MVP: TensorFlow.js and @mediapipe/pose removed (pose detection feature)
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  // POST-MVP: @mediapipe/pose removed (pose detection feature)
  // React 19 + Hermes compatibility
  react: path.resolve(workspaceRoot, 'node_modules/react'),
  'react-native': path.resolve(workspaceRoot, 'node_modules/react-native'),
  // Node.js polyfills for testing libraries
  console: require.resolve('console-browserify'),
  util: require.resolve('util'),
  process: require.resolve('process/browser'),
}

// React 19 + Hermes compatibility: ensure consistent React resolution
config.resolver.alias = {
  ...config.resolver.alias,
  react: path.resolve(workspaceRoot, 'node_modules/react'),
  'react-native': path.resolve(workspaceRoot, 'node_modules/react-native'),
}

module.exports = config
