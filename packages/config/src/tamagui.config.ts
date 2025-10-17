import { defaultConfig } from '@tamagui/config/v4'
import { createTamagui } from 'tamagui'
import { animations } from './animations'
import { bodyFont, headingFont } from './fonts'
import { themes } from './themes'

// Shadow constants for cross-platform use
export const shadows = {
  small: {
    shadowColor: 'rgba(0, 0, 0, 0.1)',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  medium: {
    shadowColor: 'rgba(0, 0, 0, 0.15)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  large: {
    shadowColor: 'rgba(0, 0, 0, 0.2)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  xlarge: {
    shadowColor: 'rgba(0, 0, 0, 0.25)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
} as const

export const config = createTamagui({
  ...defaultConfig,
  animations,
  fonts: {
    body: bodyFont,
    heading: headingFont,
  },
  themes,
  tokens: {
    ...defaultConfig.tokens,
    // Custom color tokens (defaultConfig doesn't have color tokens)
    color: {
      overlayGlass: 'rgba(20, 20, 20, 0.45)',
      overlayGlassStrong: 'rgba(0, 0, 0, 0.3)',
      whiteA70: 'rgba(255, 255, 255, 0.7)',
      orange10: '#FF6600',
    },
  },
  settings: {
    ...defaultConfig.settings,
    onlyAllowShorthands: false,
    allowedStyleValues: 'somewhat-strict',
  },
  // Custom component configurations (defaultConfig doesn't have components)
  // components: {
  //   Button: {
  //     variants: {
  //       primary: {
  //         backgroundColor: '$color9',
  //         color: '$color1',
  //         hoverStyle: {
  //           backgroundColor: '$color10',
  //         },
  //         pressStyle: {
  //           backgroundColor: '$color11',
  //         },
  //       },
  //       secondary: {
  //         backgroundColor: '$color4',
  //         color: '$color12',
  //         hoverStyle: {
  //           backgroundColor: '$color5',
  //         },
  //         pressStyle: {
  //           backgroundColor: '$color6',
  //         },
  //       },
  //     },
  //   },
  // },
})
