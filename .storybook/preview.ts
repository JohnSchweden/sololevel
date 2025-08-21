import type { Preview } from '@storybook/react-native-web-vite'
import '@tamagui/core/reset.css'
import '@tamagui/font-inter/css/400.css'
import '@tamagui/font-inter/css/700.css'
import { config } from '@my/config'
import { TamaguiProvider } from '@my/ui'
import React from 'react'

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  globalTypes: {
    theme: {
      description: 'Global theme for components',
      defaultValue: 'light',
      toolbar: {
        title: 'Theme',
        icon: 'circlehollow',
        items: ['light', 'dark'],
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    (Story) => {
      return React.createElement(
        TamaguiProvider,
        { config, defaultTheme: 'light' },
        React.createElement(Story)
      )
    },
  ],
}

export default preview
