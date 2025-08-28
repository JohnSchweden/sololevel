import { Button as TamaguiButton, styled } from 'tamagui'

// Create a properly typed Button with our custom variants
export const Button = styled(TamaguiButton, {
  name: 'CustomButton',
  variants: {
    variant: {
      ghost: {
        backgroundColor: 'transparent',
        color: '$color12',
        pressStyle: {
          opacity: 0.6,
        },
        hoverStyle: {
          backgroundColor: '$backgroundHover',
        },
      },
      primary: {
        backgroundColor: '$color9',
        color: '$color1',
        hoverStyle: {
          backgroundColor: '$color10',
        },
        pressStyle: {
          backgroundColor: '$color11',
        },
      },
      secondary: {
        backgroundColor: '$color4',
        color: '$color12',
        hoverStyle: {
          backgroundColor: '$color5',
        },
        pressStyle: {
          backgroundColor: '$color6',
        },
      },
      chromeless: {
        backgroundColor: 'transparent',
        borderColor: 'transparent',
        hoverStyle: {
          backgroundColor: 'rgba(255,255,255,0.1)',
        },
        pressStyle: {
          backgroundColor: 'rgba(255,255,255,0.2)',
        },
      },
      outlined: {
        // Add the 'outlined' variant
        backgroundColor: 'transparent',
        borderColor: '$color7',
        borderWidth: 1,
        color: '$color12',
        hoverStyle: {
          backgroundColor: 'rgba(255,255,255,0.1)',
        },
        pressStyle: {
          backgroundColor: 'rgba(255,255,255,0.2)',
        },
      },
    },
  },
})

export type ButtonProps = React.ComponentProps<typeof Button>
