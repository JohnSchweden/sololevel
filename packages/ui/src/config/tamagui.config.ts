import { createAnimations } from '@tamagui/animations-css'
import { createTamagui } from 'tamagui'

// Simple test configuration with minimal setup
const config = createTamagui({
  // Animations - use CSS animations for tests
  animations: createAnimations({
    fast: 'ease-in 150ms',
    medium: 'ease-in 300ms',
    slow: 'ease-in 450ms',
    '100ms': 'ease-in 100ms',
    '200ms': 'ease-in 200ms',
    bouncy: 'cubic-bezier(0.68, -0.55, 0.265, 1.55) 400ms',
    lazy: 'ease-out 600ms',
    quick: 'ease-in-out 200ms',
  }),
  // Settings for Tamagui
  settings: {
    allowedStyleValues: 'somewhat-strict',
    autocompleteSpecificTokens: 'except-special',
    mediaPropOrder: true,
    shouldAddPrefersColorThemes: true,
    themeClassNameOnRoot: true,
  },
  // Basic tokens for testing
  tokens: {
    color: {
      background: '#ffffff',
      text: '#000000',
      primary: '#0066FF',
      // Blue scale
      blue2: '#D0E2FF',
      blue3: '#A6C8FF',
      blue7: '#0043CE',
      blue8: '#002D9C',
      blue9: '#0066FF',
      blue10: '#0052CC',
      // Red scale
      red2: '#FFD7D9',
      red3: '#FFADB2',
      red5: '#FF6B6B',
      red6: '#FF4D4D',
      red8: '#CC0000',
      red9: '#FF0000',
      red10: '#CC0000',
      red11: '#A30000',
      // Gray scale
      gray1: '#fcfcfc',
      gray2: '#f9f9f9',
      gray3: '#f0f0f0',
      gray4: '#e8e8e8',
      gray5: '#e0e0e0',
      gray6: '#d9d9d9',
      gray7: '#cecece',
      gray8: '#bbbbbb',
      gray9: '#8d8d8d',
      gray10: '#838383',
      gray11: '#646464',
      gray12: '#202020',
      // Yellow scale
      yellow9: '#FFC107',
      yellow10: '#FFB300',
      yellow11: '#FFA000',
      // Green scale
      green9: '#4CAF50',
      // Purple scale
      purple9: '#9C27B0',
      // Orange scale
      orange9: '#FF6600',
      orange10: '#FF6600',
      // Named colors
      borderColor: '#EEEEEE',
      shadowColor: '#000000',
      white: '#FFFFFF',
      black: '#000000',
      whiteA70: 'rgba(255, 255, 255, 0.7)',
      overlayGlass: 'rgba(20, 20, 20, 0.45)',
    },
    space: {
      0.5: 2,
      1: 4,
      1.5: 6,
      2: 8,
      3: 12,
      4: 16,
      5: 20,
      6: 24,
      8: 32,
      10: 40,
      12: 48,
    },
    size: {
      0.5: 2,
      1: 4,
      1.5: 6,
      2: 8,
      3: 12,
      4: 16,
      5: 20,
      6: 24,
      8: 32,
      10: 40,
      12: 48,
    },
    radius: {
      1: 2,
      2: 4,
      3: 8,
      4: 12,
      6: 24,
      8: 32,
      10: 40,
      12: 48,
    },
    zIndex: {
      1: 100,
      2: 200,
    },
    font: {
      mono: 'monospace',
    },
  },

  // Simple themes with comprehensive color tokens
  themes: {
    light: {
      background: '#ffffff',
      backgroundHover: '#f5f5f5',
      backgroundPress: '#eeeeee',
      color: '#000000',
      color1: '#fcfcfc',
      color2: '#f9f9f9',
      color3: '#f0f0f0',
      color4: '#e8e8e8',
      color5: '#e0e0e0',
      color6: '#d9d9d9',
      color7: '#cecece',
      color8: '#bbbbbb',
      color9: '#8d8d8d',
      color10: '#838383',
      color11: '#646464',
      color12: '#202020',
      borderColor: '#EEEEEE',
      primary: '#0066FF',
    },
    dark: {
      background: '#111111',
      backgroundHover: '#222222',
      backgroundPress: '#333333',
      color: '#ffffff',
      color1: '#202020',
      color2: '#2a2a2a',
      color3: '#313131',
      color4: '#3a3a3a',
      color5: '#484848',
      color6: '#606060',
      color7: '#6e6e6e',
      color8: '#7b7b7b',
      color9: '#b4b4b4',
      color10: '#bebebe',
      color11: '#eeeeee',
      color12: '#ffffff',
      borderColor: '#333333',
      primary: '#0066FF',
    },
  },

  // Media queries for responsive tests
  media: {
    xs: { maxWidth: 428 },
    sm: { minWidth: 429, maxWidth: 768 },
    md: { minWidth: 769, maxWidth: 1024 },
    lg: { minWidth: 1025 },
  },
})

// Type the config
type AppConfig = typeof config

// Extend the default Tamagui config
declare module 'tamagui' {
  interface TamaguiCustomConfig extends AppConfig {}
}

export default config
