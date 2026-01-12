import { MODE_OPTIONS } from '@app/features/Onboarding/constants'
import { useAuth } from '@app/hooks/useAuth'
import { useStableSafeArea } from '@app/provider/safe-area/use-safe-area'
import { useVoicePreferencesStore } from '@app/stores/voicePreferences'
import type { CoachGender, CoachMode } from '@my/api'
import {
  GlassBackground,
  type RadioOption,
  SettingsRadioGroup,
  SettingsSectionHeader,
  SettingsSelectItem,
  type SettingsSelectItemOption,
  SettingsToggleItem,
} from '@my/ui'
import {
  AArrowUp,
  ChevronDown,
  Globe,
  Mic,
  Palette,
  Sparkles,
  Type,
  User,
  Vibrate,
  Volume2,
  Zap,
} from '@tamagui/lucide-icons'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { View } from 'react-native'
import { ScrollView, Text, XStack, YStack } from 'tamagui'

export interface PersonalisationScreenProps {
  /**
   * Test ID for testing
   */
  testID?: string
}

/**
 * PersonalisationScreen Component
 *
 * Personalisation settings screen with voice preferences, theme, language, accessibility, and interaction preferences.
 * Following SettingsScreen and SecurityScreen patterns with GlassBackground and AppHeader configuration.
 *
 * @example
 * ```tsx
 * <PersonalisationScreen />
 * ```
 */
export function PersonalisationScreen({
  testID = 'personalisation-screen',
}: PersonalisationScreenProps): React.ReactElement {
  // Auth state for user ID
  const { userId } = useAuth()

  // Voice preferences store - use individual selectors to prevent unnecessary re-renders
  const gender = useVoicePreferencesStore((state) => state.gender)
  const mode = useVoicePreferencesStore((state) => state.mode)
  const isLoaded = useVoicePreferencesStore((state) => state.isLoaded)
  const setGender = useVoicePreferencesStore((state) => state.setGender)
  const setMode = useVoicePreferencesStore((state) => state.setMode)
  const loadFromDatabase = useVoicePreferencesStore((state) => state.loadFromDatabase)
  const syncToDatabase = useVoicePreferencesStore((state) => state.syncToDatabase)

  // Use stable safe area hook that properly memoizes insets
  const insets = useStableSafeArea()
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

  // Load voice preferences on mount if not loaded
  useEffect(() => {
    if (userId && !isLoaded) {
      loadFromDatabase(userId)
    }
  }, [userId, isLoaded, loadFromDatabase])

  // Voice gender options (memoized - array is static, never changes)
  const genderOptions: RadioOption[] = useMemo(
    () => [
      { value: 'female', label: 'Female' },
      { value: 'male', label: 'Male' },
    ],
    []
  )

  // Voice mode options (memoized - use same content as ModeCards)
  const modeOptions: RadioOption[] = useMemo(
    () =>
      MODE_OPTIONS.map((option) => ({
        value: option.value,
        label: option.label,
        description: option.description,
      })),
    []
  )

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

  // Handle gender change with optimistic update and database sync
  const handleGenderChange = useCallback(
    (value: string) => {
      setGender(value as CoachGender)
      if (userId) {
        syncToDatabase(userId)
      }
    },
    [userId, setGender, syncToDatabase]
  )

  // Handle mode change with optimistic update and database sync
  const handleModeChange = useCallback(
    (value: string) => {
      setMode(value as CoachMode)
      if (userId) {
        syncToDatabase(userId)
      }
    },
    [userId, setMode, syncToDatabase]
  )

  // Handle theme change
  const handleThemeChange = useCallback((value: string) => {
    setTheme(value as 'light' | 'dark' | 'auto')
  }, [])

  return (
    <GlassBackground
      backgroundColor="$color3"
      testID={testID}
    >
      <View style={containerStyle}>
        <ScrollView flex={1}>
          <YStack
            paddingTop={insets.top + APP_HEADER_HEIGHT + 20}
            paddingHorizontal="$4"
            gap="$6"
            paddingBottom={insets.bottom + 24}
          >
            {/* Coach Voice Section */}
            <YStack marginBottom="$4">
              <SettingsSectionHeader
                title="Coach Voice"
                icon={Mic}
              />
              <YStack gap="$4">
                <SettingsRadioGroup
                  icon={Sparkles}
                  iconColor="$orange10"
                  title="Learning Mode"
                  description="How your coach delivers feedback"
                  value={mode}
                  onValueChange={handleModeChange}
                  options={modeOptions}
                  testID="voice-mode-radio"
                />
                <SettingsRadioGroup
                  icon={User}
                  iconColor="$blue10"
                  title="Voice Gender"
                  description="Male or female coach voice"
                  value={gender}
                  onValueChange={handleGenderChange}
                  options={genderOptions}
                  testID="voice-gender-radio"
                />
              </YStack>
            </YStack>

            {/* Separator with Demo Data label */}
            <YStack
              paddingHorizontal="$4"
              marginTop={-20}
            >
              <XStack
                justifyContent="center"
                alignItems="center"
                gap="$2"
              >
                <ChevronDown
                  size={20}
                  color="$color11"
                />
                <Text
                  fontSize="$3"
                  color="$color11"
                  textAlign="center"
                  testID="personalisation-demo-data-label"
                >
                  Demo Data
                </Text>
                <ChevronDown
                  size={20}
                  color="$color11"
                />
              </XStack>
            </YStack>

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
                onValueChange={handleThemeChange}
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
