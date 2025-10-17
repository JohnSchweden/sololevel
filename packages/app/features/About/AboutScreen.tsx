import { GlassBackground, SettingsListItem, SettingsSectionHeader } from '@my/ui'
import { useHeaderHeight } from '@react-navigation/elements'
import { FileText } from '@tamagui/lucide-icons'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ScrollView, Text, XStack, YStack } from 'tamagui'

// App metadata (from package.json)
const APP_NAME = 'Solo:Level'
const APP_VERSION = '1.0.0'
const APP_DESCRIPTION = 'Your healthy relationship with a coach.'

export interface AboutScreenProps {
  /**
   * Optional callback for Privacy Policy navigation (for testing/dependency injection)
   */
  onPrivacyPress?: () => void

  /**
   * Optional callback for Terms of Service navigation (for testing/dependency injection)
   */
  onTermsPress?: () => void

  /**
   * Optional callback for Licenses navigation (for testing/dependency injection)
   */
  onLicensesPress?: () => void

  /**
   * Test ID for testing
   */
  testID?: string
}

/**
 * AboutScreen Component
 *
 * Displays app information, version, and legal links.
 * Reuses SettingsListItem and SettingsSectionHeader components for consistency.
 *
 * @example
 * ```tsx
 * <AboutScreen />
 * ```
 */
export function AboutScreen({
  onPrivacyPress,
  onTermsPress,
  onLicensesPress,
  testID = 'about-screen',
}: AboutScreenProps = {}): React.ReactElement {
  const headerHeight = useHeaderHeight()

  return (
    <GlassBackground
      backgroundColor="$color3"
      testID={testID}
    >
      <SafeAreaView
        edges={['bottom']}
        style={{ flex: 1 }}
      >
        <ScrollView flex={1}>
          <YStack
            paddingTop={headerHeight + 30}
            paddingHorizontal="$4"
            gap="$6"
            paddingBottom="$6"
          >
            {/* App Info Section - Custom */}
            <YStack
              alignItems="center"
              gap="$4"
              marginBottom="$4"
            >
              {/* Logo Container */}
              <XStack
                width={80}
                height={80}
                $md={{ width: 96, height: 96 }}
                backgroundColor="$purple10"
                borderRadius="$6"
                borderWidth={1}
                borderColor="$borderColor"
                alignItems="center"
                justifyContent="center"
                testID={`${testID}-logo`}
              >
                <Text
                  fontSize="$9"
                  color="$color"
                  fontWeight="700"
                >
                  S
                </Text>
              </XStack>

              {/* App Name */}
              <Text
                fontSize="$7"
                fontWeight="600"
                color="$color"
              >
                {APP_NAME}
              </Text>

              {/* Version */}
              <Text
                fontSize="$3"
                color="$color11"
              >
                Version {APP_VERSION}
              </Text>

              {/* Description */}
              <Text
                fontSize="$3"
                color="$color11"
                textAlign="center"
                paddingHorizontal="$4"
              >
                {APP_DESCRIPTION}
              </Text>
            </YStack>

            {/* Legal Section - Reusable Components */}
            <YStack>
              <SettingsSectionHeader
                icon={FileText}
                title="Legal"
              />

              <YStack
                gap="$4"
                marginBottom="$6"
              >
                <SettingsListItem
                  label="Privacy Policy"
                  onPress={onPrivacyPress || (() => {})}
                />
                <SettingsListItem
                  label="Terms of Service"
                  onPress={onTermsPress || (() => {})}
                />
                <SettingsListItem
                  label="Licenses"
                  onPress={onLicensesPress || (() => {})}
                />
              </YStack>
            </YStack>

            {/* Copyright - Custom */}
            <YStack
              paddingTop="$6"
              borderTopWidth={1}
              borderTopColor="$borderColor"
              alignItems="center"
            >
              <Text
                fontSize="$2"
                color="$color9"
              >
                © 2025 {APP_NAME}. All rights reserved.
              </Text>
            </YStack>
          </YStack>
        </ScrollView>
      </SafeAreaView>
    </GlassBackground>
  )
}
