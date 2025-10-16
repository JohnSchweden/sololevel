import {
  GlassBackground,
  SettingsRadioGroup,
  SettingsSectionHeader,
  SettingsSelectItem,
  type SettingsSelectItemOption,
  SettingsToggleItem,
} from '@my/ui'
import { useHeaderHeight } from '@react-navigation/elements'
import { AArrowUp, Globe, Palette, Type, Vibrate, Volume2, Zap } from '@tamagui/lucide-icons'
import { useState } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ScrollView, YStack } from 'tamagui'

export interface PersonalisationScreenProps {
  /**
   * Test ID for testing
   */
  testID?: string
}

/**
 * PersonalisationScreen Component
 *
 * Personalisation settings screen with theme, language, accessibility, and interaction preferences.
 * Following SettingsScreen and SecurityScreen patterns with GlassBackground and AppHeader configuration.
 *
 * @example
 * ```tsx
 * <PersonalisationScreen />
 * ```
 */
export function PersonalisationScreen({
  testID = 'personalisation-screen',
}: PersonalisationScreenProps = {}): React.ReactElement {
  const headerHeight = useHeaderHeight()

  // Local state for personalisation settings (P1: Move to Zustand store)
  const [theme, setTheme] = useState<'light' | 'dark' | 'auto'>('auto')
  const [language, setLanguage] = useState('en-US')
  const [largeText, setLargeText] = useState(false)
  const [reduceAnimations, setReduceAnimations] = useState(false)
  const [soundEffects, setSoundEffects] = useState(true)
  const [hapticFeedback, setHapticFeedback] = useState(true)

  // Language options
  const languageOptions: SettingsSelectItemOption[] = [
    { value: 'en-US', label: 'English (US)' },
    { value: 'en-GB', label: 'English (UK)' },
    { value: 'es-ES', label: 'Español' },
    { value: 'fr-FR', label: 'Français' },
    { value: 'de-DE', label: 'Deutsch' },
    { value: 'it-IT', label: 'Italiano' },
    { value: 'pt-BR', label: 'Português (BR)' },
    { value: 'ja-JP', label: '日本語' },
    { value: 'ko-KR', label: '한국어' },
    { value: 'zh-CN', label: '中文 (简体)' },
  ]

  return (
    <GlassBackground
      backgroundColor="$color3"
      testID={testID}
    >
      <SafeAreaView
        edges={['bottom']}
        style={{ flex: 1 }}
      >
        <ScrollView
          flex={1}
          contentContainerStyle={{
            paddingTop: headerHeight + 30,
            paddingHorizontal: 16, // $4 = 16px
            paddingBottom: 24, // Extra padding for safe area
          }}
        >
          <YStack gap="$6">
            {/* Appearance Section */}
            <YStack
              gap="$3"
              marginBottom="$6"
            >
              <SettingsSectionHeader
                title="Appearance"
                icon={Palette}
              />
              <SettingsRadioGroup
                icon={Palette}
                iconColor="$purple10"
                iconBackground="$purple2"
                iconBorder="$purple4"
                title="Theme"
                description="Choose your preferred theme"
                value={theme}
                onValueChange={setTheme}
              />
            </YStack>

            {/* Language & Region Section */}
            <YStack
              gap="$3"
              marginBottom="$6"
            >
              <SettingsSectionHeader
                title="Language & Region"
                icon={Globe}
              />
              <SettingsSelectItem
                icon={Globe}
                iconColor="$blue10"
                iconBackground="$blue2"
                iconBorder="$blue4"
                title="Language"
                description="Select your preferred language"
                options={languageOptions}
                value={language}
                onValueChange={setLanguage}
              />
            </YStack>

            {/* Accessibility Section */}
            <YStack
              gap="$3"
              marginBottom="$6"
            >
              <SettingsSectionHeader
                title="Accessibility"
                icon={Type}
              />
              <SettingsToggleItem
                icon={AArrowUp}
                iconColor="$blue10"
                iconBackground="$blue2"
                iconBorder="$blue4"
                title="Large Text"
                description="Increase text size for better readability"
                value={largeText}
                onValueChange={setLargeText}
              />
              <SettingsToggleItem
                icon={Zap}
                iconColor="$orange10"
                iconBackground="$orange2"
                iconBorder="$orange4"
                title="Reduce Animations"
                description="Minimize motion effects"
                value={reduceAnimations}
                onValueChange={setReduceAnimations}
              />
            </YStack>

            {/* Interaction Section */}
            <YStack
              gap="$3"
              marginBottom="$6"
            >
              <SettingsSectionHeader
                title="Interaction"
                icon={Zap}
              />
              <SettingsToggleItem
                icon={Volume2}
                iconColor="$green10"
                iconBackground="$green2"
                iconBorder="$green4"
                title="Sound Effects"
                description="Play sounds for interactions"
                value={soundEffects}
                onValueChange={setSoundEffects}
              />
              <SettingsToggleItem
                icon={Vibrate}
                iconColor="$purple10"
                iconBackground="$purple2"
                iconBorder="$purple4"
                title="Haptic Feedback"
                description="Feel vibrations for actions"
                value={hapticFeedback}
                onValueChange={setHapticFeedback}
              />
            </YStack>
          </YStack>
        </ScrollView>
      </SafeAreaView>
    </GlassBackground>
  )
}
