import { useStableSafeArea } from '@app/provider/safe-area/use-safe-area'
import { GlassBackground, SettingsListItem, SettingsSectionHeader } from '@my/ui'
import { FileText } from '@tamagui/lucide-icons'
import { useMemo } from 'react'
import { View } from 'react-native'
import { Image, ScrollView, Text, XStack, YStack } from 'tamagui'

// Import app icon
const appIcon = require('../../../../apps/expo/assets/icon-transparent.png')
// Import logo text image
const logoText = require('../../../../apps/expo/assets/logo_text.png')

// App metadata (from package.json)
const APP_NAME = 'Solo:Level'
const APP_VERSION = '1.0.0'
const APP_DESCRIPTION = 'Your toxic relationship with a coach you will never forget.'

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
  // Use stable safe area hook that properly memoizes insets
  const insets = useStableSafeArea()
  const APP_HEADER_HEIGHT = 44 // Fixed height from AppHeader component

  // PERF FIX: Memoize container style to prevent recalculating layout on every render
  const containerStyle = useMemo(() => ({ flex: 1 as const }), [])

  return (
    <GlassBackground
      backgroundColor="$color3"
      testID={testID}
    >
      <View style={containerStyle}>
        <ScrollView flex={1}>
          <YStack
            paddingTop={insets.top + APP_HEADER_HEIGHT}
            paddingHorizontal="$4"
            gap="$6"
            paddingBottom={insets.bottom + 24}
          >
            {/* App Info Section - Custom */}
            <YStack
              alignItems="center"
              gap="$4"
              marginBottom="$4"
              paddingTop="$8"
            >
              {/* Logo Container */}
              <XStack
                width={80}
                height={80}
                $md={{ width: 96, height: 96 }}
                //backgroundColor="$purple10"
                borderRadius="$6"
                borderWidth={0}
                borderColor="$borderColor"
                alignItems="center"
                justifyContent="center"
                overflow="hidden"
                shadowColor="$color"
                shadowOffset={{ width: 0, height: 2 }}
                shadowOpacity={0.2}
                shadowRadius={4}
                elevation={4}
                testID={`${testID}-logo`}
              >
                <Image
                  source={appIcon}
                  width={80}
                  height={80}
                  $md={{ width: 96, height: 96 }}
                  resizeMode="contain"
                />
              </XStack>

              {/* App Name */}
              <Image
                source={logoText}
                width={120}
                height={20}
                resizeMode="contain"
                testID={`${testID}-logo-text`}
              />

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
                paddingTop="$2"
                marginBottom="$4"
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
              paddingTop="$4"
              borderTopWidth={0}
              borderTopColor="$borderColor"
              alignItems="center"
            >
              <Text
                fontSize="$2"
                color="$color10"
              >
                © 2025 {APP_NAME}. All rights reserved.
              </Text>
            </YStack>
          </YStack>
        </ScrollView>
      </View>
    </GlassBackground>
  )
}
