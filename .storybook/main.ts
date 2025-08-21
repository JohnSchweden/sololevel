import type { StorybookConfig } from '@storybook/react-native-web-vite'
import { join } from 'node:path'

const config: StorybookConfig = {
  stories: [
    '../stories/**/*.mdx',
    '../stories/**/*.stories.@(js|jsx|mjs|ts|tsx)',
    '../packages/app/features/**/*.stories.@(js|jsx|mjs|ts|tsx)',
  ],
  addons: ['@storybook/addon-docs'],
  framework: {
    name: '@storybook/react-native-web-vite',
    options: {},
  },
  viteFinal: async (config) => {
    // Add Tamagui configuration
    config.define = {
      ...config.define,
      'process.env.TAMAGUI_TARGET': '"web"',
      'process.env.NODE_ENV': '"development"',
    }

    // Add alias for packages
    config.resolve = {
      ...config.resolve,
      alias: {
        ...config.resolve?.alias,
        '@my/ui': join(__dirname, '../packages/ui/src'),
        '@my/config': join(__dirname, '../packages/config/src'),
        app: join(__dirname, '../packages/app'),
      },
    }

    // Mock Solito navigation for Storybook
    config.resolve = {
      ...config.resolve,
      alias: {
        ...config.resolve?.alias,
        'solito/navigation': join(__dirname, './mocks/solito-navigation.ts'),
      },
    }

    return config
  },
}
export default config
