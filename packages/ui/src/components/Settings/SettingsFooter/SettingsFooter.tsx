import { log } from '@my/logging'
import { Button, Text, XStack, YStack } from 'tamagui'

export type FooterLinkType = 'privacy' | 'terms' | 'faq'

export interface SettingsFooterProps {
  /**
   * Callback when a footer link is pressed
   * @param link - The link type that was pressed
   */
  onLinkPress: (link: FooterLinkType) => void

  /**
   * Test ID for testing
   */
  testID?: string
}

/**
 * SettingsFooter Component
 *
 * Displays footer links for Privacy Policy, Terms of Use, and FAQ.
 * Links are styled as chromeless buttons with hover states.
 *
 * @example
 * ```tsx
 * <SettingsFooter
 *   onLinkPress={(link) => {
 *     if (link === 'privacy') WebBrowser.openBrowserAsync('https://...')
 *   }}
 * />
 * ```
 */
export function SettingsFooter({
  onLinkPress,
  testID = 'settings-footer',
}: SettingsFooterProps): React.ReactElement {
  const links: Array<{ label: string; type: FooterLinkType }> = [
    { label: 'Privacy', type: 'privacy' },
    { label: 'Terms of use', type: 'terms' },
    { label: 'FAQ', type: 'faq' },
  ]

  return (
    <YStack
      position="absolute"
      bottom={0}
      left={36}
      right={36}
      paddingVertical="$2"
      paddingHorizontal="$4"
      testID={testID}
    >
      <XStack
        justifyContent="space-between"
        alignItems="center"
        width="100%"
      >
        {links.map(({ label, type }) => (
          <Button
            key={type}
            unstyled
            onPress={() => {
              log.info('SettingsFooter', 'Link pressed', { label, type })
              onLinkPress(type)
            }}
            pressStyle={{
              opacity: 0.8,
            }}
            hoverStyle={{
              opacity: 0.9,
            }}
            testID={`${testID}-link-${type}`}
            accessibilityRole="button"
            accessibilityLabel={`${label} link`}
          >
            <Text
              fontSize="$3"
              fontWeight="400"
              color="$color11"
            >
              {label}
            </Text>
          </Button>
        ))}
      </XStack>
    </YStack>
  )
}
