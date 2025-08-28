import { createTamagui } from "tamagui";

// Simple test configuration with minimal setup
const config = createTamagui({
  // Basic tokens for testing
  tokens: {
    color: {
      background: "#ffffff",
      text: "#000000",
      blue9: "#0066FF",
      blue10: "#0052CC",
      red9: "#FF0000",
      red10: "#CC0000",
      gray8: "#888888",
      gray10: "#666666",
      gray11: "#444444",
      borderColor: "#EEEEEE",
      shadowColor: "#000000",
      orange10: "#FF6600",
    },
    space: {
      1: 4,
      2: 8,
      3: 12,
      4: 16,
      6: 24,
      8: 32,
    },
    size: {
      1: 4,
      2: 8,
      3: 12,
      4: 16,
      5: 20,
      6: 24,
    },
    radius: {
      1: 2,
      2: 4,
      3: 8,
      4: 12,
      12: 24,
    },
    zIndex: {
      1: 100,
      2: 200,
    },
    font: {
      mono: "monospace",
    },
  },

  // Simple themes
  themes: {
    light: {
      background: "#ffffff",
      backgroundHover: "#f5f5f5",
      backgroundPress: "#eeeeee",
    },
    dark: {
      background: "#111111",
      backgroundHover: "#222222",
      backgroundPress: "#333333",
    },
  },

  // Media queries for responsive tests
  media: {
    xs: { maxWidth: 428 },
    sm: { minWidth: 429, maxWidth: 768 },
    md: { minWidth: 769, maxWidth: 1024 },
    lg: { minWidth: 1025 },
  },
});

// Type the config
type AppConfig = typeof config;

// Extend the default Tamagui config
declare module "tamagui" {
  interface TamaguiCustomConfig extends AppConfig {}
}

export default config;
