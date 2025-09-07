const { getDefaultConfig } = require('@expo/metro-config')

const config = getDefaultConfig(__dirname)

// Add web support
config.resolver.platforms = ['ios', 'android', 'native', 'web']

// Add path aliases
config.resolver.alias = {
  '@my/ui': '../../packages/ui/src',
  '@my/config': '../../packages/config/src',
  app: '../../packages/app',
}

module.exports = config
