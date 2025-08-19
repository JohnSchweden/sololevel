import type { StorybookConfig } from '@storybook/react-native-web-vite';
import { join } from 'path';

const config: StorybookConfig = {
  "stories": [
    "../stories/**/*.mdx",
    "../stories/**/*.stories.@(js|jsx|mjs|ts|tsx)",
    "../packages/app/features/**/*.stories.@(js|jsx|mjs|ts|tsx)"
  ],
  "addons": [
    "@storybook/addon-docs"
  ],
  "framework": {
    "name": "@storybook/react-native-web-vite",
    "options": {}
  },
  "viteFinal": async (config) => {
    console.log('🔧 Configuring Vite for Storybook...');
    
    // Add Tamagui configuration
    config.define = {
      ...config.define,
      'process.env.TAMAGUI_TARGET': '"web"',
      'process.env.NODE_ENV': '"development"',
    };
    
    // Add alias for packages
    config.resolve = {
      ...config.resolve,
      alias: {
        ...config.resolve?.alias,
        '@my/ui': join(__dirname, '../packages/ui/src'),
        '@my/config': join(__dirname, '../packages/config/src'),
        'app': join(__dirname, '../packages/app'),
      },
    };

    // Mock Solito navigation for Storybook
    config.resolve = {
      ...config.resolve,
      alias: {
        ...config.resolve?.alias,
        'solito/navigation': join(__dirname, './mocks/solito-navigation.ts'),
      },
    };
    
    console.log('✅ Vite configuration applied');
    console.log('📁 Aliases:', config.resolve?.alias);
    
    return config;
  },
};
export default config;