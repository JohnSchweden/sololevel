import { defaultConfig } from "@tamagui/config/v4";
import { createTamagui } from "tamagui";
import { bodyFont, headingFont } from "./fonts";
import { animations } from "./animations";

export const config = createTamagui({
  ...defaultConfig,
  animations,
  fonts: {
    body: bodyFont,
    heading: headingFont,
  },
  tokens: {
    ...defaultConfig.tokens,
    color: {
      ...(defaultConfig.tokens as any).color,
      overlayGlass: "rgba(20, 20, 20, 0.45)",
      overlayGlassStrong: "rgba(0, 0, 0, 0.6)",
      whiteA70: "rgba(255, 255, 255, 0.7)",
      orange10: "#FF6600",
    },
  },
  settings: {
    ...defaultConfig.settings,
    onlyAllowShorthands: false,
    allowedStyleValues: "somewhat-strict",
  },
  components: {
    ...(defaultConfig as any).components,
    Button: {
      ...(defaultConfig as any).components?.Button,
      variants: {
        ...(defaultConfig as any).components?.Button?.variants,
        ghost: {
          backgroundColor: "transparent",
          color: "$color12",
          pressStyle: {
            opacity: 0.6,
          },
          hoverStyle: {
            backgroundColor: "$backgroundHover",
          },
        },
        primary: {
          backgroundColor: "$color9",
          color: "$color1",
          hoverStyle: {
            backgroundColor: "$color10",
          },
          pressStyle: {
            backgroundColor: "$color11",
          },
        },
        secondary: {
          backgroundColor: "$color4",
          color: "$color12",
          hoverStyle: {
            backgroundColor: "$color5",
          },
          pressStyle: {
            backgroundColor: "$color6",
          },
        },
      },
    },
  },
});
