import { useSafeArea } from '@app/provider/safe-area/use-safe-area'
import {
  GlassBackground,
  SettingsRadioGroup,
  SettingsSectionHeader,
  SettingsSelectItem,
  type SettingsSelectItemOption,
  SettingsToggleItem,
} from '@my/ui'
import { AArrowUp, Globe, Palette, Type, Vibrate, Volume2, Zap } from '@tamagui/lucide-icons'
import { useMemo, useState } from 'react'
import { View } from 'react-native'
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
  const insetsRaw = useSafeArea()
  // PERF FIX: Memoize insets to prevent re-renders when values haven't changed
  const insets = useMemo(
    () => insetsRaw,
    [insetsRaw.top, insetsRaw.bottom, insetsRaw.left, insetsRaw.right]
  )
  const APP_HEADER_HEIGHT = 44 // Fixed height from AppHeader component

  // PERF FIX: Memoize container style to prevent recalculating layout on every render
  const containerStyle = useMemo(() => ({ flex: 1 as const }), [])

  // Local state for personalisation settings (P1: Move to Zustand store)
  const [theme, setTheme] = useState<'light' | 'dark' | 'auto'>('auto')
  const [language, setLanguage] = useState('en-US')
  const [largeText, setLargeText] = useState(false)
  const [reduceAnimations, setReduceAnimations] = useState(false)
  const [soundEffects, setSoundEffects] = useState(true)
  const [hapticFeedback, setHapticFeedback] = useState(true)

  // Language options (memoized - array is static, never changes)
  const languageOptions: SettingsSelectItemOption[] = useMemo(
    () => [
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
    ],
    []
  )

  return (
    <GlassBackground
      backgroundColor="$color3"
      testID={testID}
    >
      <View style={containerStyle}>
        <ScrollView flex={1}>
          <YStack
            paddingTop={insets.top + APP_HEADER_HEIGHT + 30}
            paddingHorizontal="$4"
            gap="$6"
            paddingBottom={insets.bottom + 24}
          >
            {/* Appearance Section */}
            <YStack marginBottom="$4">
              <SettingsSectionHeader
                title="Appearance"
                icon={Palette}
              />
              <SettingsRadioGroup
                icon={Palette}
                iconColor="$purple10"
                title="Theme"
                description="Choose your preferred theme"
                value={theme}
                onValueChange={setTheme}
              />
            </YStack>

            {/* Language & Region Section */}
            <YStack marginBottom="$4">
              <SettingsSectionHeader
                title="Language & Region"
                icon={Globe}
              />
              <SettingsSelectItem
                icon={Globe}
                iconColor="$blue10"
                title="Language"
                description="Select your preferred language"
                options={languageOptions}
                value={language}
                onValueChange={setLanguage}
              />
            </YStack>

            {/* Accessibility Section */}
            <YStack marginBottom="$4">
              <SettingsSectionHeader
                title="Accessibility"
                icon={Type}
              />
              <YStack gap="$4">
                <SettingsToggleItem
                  icon={AArrowUp}
                  iconColor="$blue10"
                  title="Large Text"
                  description="Increase text size for better readability"
                  value={largeText}
                  onValueChange={setLargeText}
                />
                <SettingsToggleItem
                  icon={Zap}
                  iconColor="$orange10"
                  title="Reduce Animations"
                  description="Minimize motion effects"
                  value={reduceAnimations}
                  onValueChange={setReduceAnimations}
                />
              </YStack>
            </YStack>

            {/* Interaction Section */}
            <YStack marginBottom="$4">
              <SettingsSectionHeader
                title="Interaction"
                icon={Zap}
              />
              <YStack gap="$4">
                <SettingsToggleItem
                  icon={Volume2}
                  iconColor="$green10"
                  title="Sound Effects"
                  description="Play sounds for interactions"
                  value={soundEffects}
                  onValueChange={setSoundEffects}
                />
                <SettingsToggleItem
                  icon={Vibrate}
                  iconColor="$purple10"
                  title="Haptic Feedback"
                  description="Feel vibrations for actions"
                  value={hapticFeedback}
                  onValueChange={setHapticFeedback}
                />
              </YStack>
            </YStack>
          </YStack>
        </ScrollView>
      </View>
    </GlassBackground>
  )
}
