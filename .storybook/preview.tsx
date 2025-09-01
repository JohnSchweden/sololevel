import type { Preview } from '@storybook/react-native-web-vite'

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  decorators: [
    (Story) => {
      try {
        const uiModule = require('@my/ui')
        const { TamaguiProvider, config } = uiModule

        return (
          <TamaguiProvider
            config={config}
            defaultTheme="light"
          >
            <Story />
          </TamaguiProvider>
        )
      } catch (_error) {
        return <Story />
      }
    },
  ],
}

export default preview
