/**
 * Voice Selection Screen
 * First-login onboarding screen for selecting coach gender and feedback mode
 */

import { useSafeArea } from '@app/provider/safe-area/use-safe-area'
import { useAuthStore } from '@app/stores/auth'
import { useVoicePreferencesStore } from '@app/stores/voicePreferences'
import type { CoachGender, CoachMode } from '@my/api'
import { log } from '@my/logging'
import {
  GlassBackground,
  GlassButton,
  H2,
  Paragraph,
  type RadioOption,
  SettingsRadioGroup,
} from '@my/ui'
import { Sparkles, User } from '@tamagui/lucide-icons'
import { useMemo, useState } from 'react'
import { KeyboardAvoidingView, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { ScrollView, YStack } from 'tamagui'
import { DEFAULT_PREFERENCES, MODE_OPTIONS } from './constants'

export interface VoiceSelectionScreenProps {
  /**
   * Callback when user completes selection and saves preferences
   * Navigate to main app after this callback
   */
  onContinue: () => void

  /**
   * Test ID for testing
   * @default 'voice-selection-screen'
   */
  testID?: string
}

/**
 * VoiceSelectionScreen Component
 *
 * First-login onboarding screen that allows users to select their preferred
 * coach gender and feedback mode before accessing the main app.
 *
 * Features:
 * - Gender selection: Male/Female (Female preselected)
 * - Mode selection: Roast:Me/Zen:Me/Lovebomb:Me (Roast:Me preselected)
 * - Saves preferences to database via voicePreferencesStore
 * - Only shown when coach_mode is NULL in profile (first login)
 *
 * @example
 * ```tsx
 * <VoiceSelectionScreen
 *   onContinue={() => router.replace('/')}
 * />
 * ```
 */
export function VoiceSelectionScreen({
  onContinue,
  testID = 'voice-selection-screen',
}: VoiceSelectionScreenProps): React.ReactElement {
  const user = useAuthStore((state) => state.user)
  // Use individual selectors to prevent unnecessary re-renders
  const setGender = useVoicePreferencesStore((state) => state.setGender)
  const setMode = useVoicePreferencesStore((state) => state.setMode)
  const syncToDatabase = useVoicePreferencesStore((state) => state.syncToDatabase)
  const insets = useSafeArea()

  // Local state for selections (optimistic updates)
  const [selectedGender, setSelectedGender] = useState<CoachGender>(DEFAULT_PREFERENCES.gender)
  const [selectedMode, setSelectedMode] = useState<CoachMode>(DEFAULT_PREFERENCES.mode)
  const [isSaving, setIsSaving] = useState(false)

  // Gender options (memoized - array is static, never changes)
  const genderOptions: RadioOption[] = useMemo(
    () => [
      { value: 'female', label: 'Female' },
      { value: 'male', label: 'Male' },
    ],
    []
  )

  // Mode options (memoized - use same content as ModeCards)
  const modeOptions: RadioOption[] = useMemo(
    () =>
      MODE_OPTIONS.map((option) => ({
        value: option.value,
        label: option.label,
        description: option.description,
      })),
    []
  )

  const handleGenderChange = (value: string) => {
    const gender = value as CoachGender
    log.info('VoiceSelectionScreen', 'Gender changed', { gender })
    setSelectedGender(gender)
    setGender(gender)
  }

  const handleModeChange = (value: string) => {
    const mode = value as CoachMode
    log.info('VoiceSelectionScreen', 'Mode changed', { mode })
    setSelectedMode(mode)
    setMode(mode)
  }

  const handleContinue = async () => {
    if (!user?.id) {
      log.error('VoiceSelectionScreen', 'Cannot save preferences: no user ID')
      return
    }

    setIsSaving(true)
    log.info('VoiceSelectionScreen', 'Saving preferences', {
      gender: selectedGender,
      mode: selectedMode,
      userId: user.id,
    })

    try {
      // Sync to database (store already has optimistic updates)
      await syncToDatabase(user.id)

      log.info('VoiceSelectionScreen', 'Preferences saved successfully')
      onContinue()
    } catch (error) {
      log.error('VoiceSelectionScreen', 'Failed to save preferences', {
        error: error instanceof Error ? error.message : 'Unknown error',
      })
      // Keep user on screen to retry - button will become enabled again
      setIsSaving(false)
    }
  }

  return (
    <GlassBackground
      backgroundColor="$color3"
      testID={testID}
    >
      <SafeAreaView
        edges={[]}
        style={{ flex: 1 }}
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <ScrollView
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
          >
            <YStack
              flex={1}
              justifyContent="center"
              alignItems="center"
              gap="$4"
              paddingHorizontal="$6"
              paddingTop={insets.top}
              paddingBottom={insets.bottom}
              overflow="visible"
            >
              {/* Header Section */}
              <YStack
                gap="$3"
                alignItems="center"
              >
                <H2
                  fontSize={24}
                  fontWeight="600"
                  color="$color12"
                  textAlign="center"
                  letterSpacing={-0.85}
                >
                  Let's get you started
                </H2>
                <Paragraph
                  fontSize="$4"
                  color="$color11"
                  textAlign="center"
                  maxWidth={280}
                >
                  Customize your Solo:Leveling
                </Paragraph>
              </YStack>

              {/* Gender and Mode Selectors */}
              <YStack
                gap="$3"
                width="100%"
                maxWidth={400}
              >
                <SettingsRadioGroup
                  icon={Sparkles}
                  iconColor="$orange10"
                  title="Learning Mode"
                  description="How your coach delivers feedback"
                  value={selectedMode}
                  onValueChange={handleModeChange}
                  options={modeOptions}
                  testID="mode-selector"
                />

                <SettingsRadioGroup
                  icon={User}
                  iconColor="$blue10"
                  title="Voice Gender"
                  description="Male or female coach voice"
                  value={selectedGender}
                  onValueChange={handleGenderChange}
                  options={genderOptions}
                  testID="gender-selector"
                />
              </YStack>

              {/* Continue Button */}
              <YStack
                gap="$2"
                alignItems="center"
                width="100%"
                maxWidth={400}
                paddingHorizontal="$4"
              >
                <GlassButton
                  onPress={handleContinue}
                  disabled={isSaving}
                  testID="continue-button"
                  accessibilityLabel="Continue to app"
                  minHeight={44}
                  minWidth="100%"
                  borderRadius="$4"
                  borderWidth={1.1}
                  borderColor="$color12"
                  blurIntensity={0}
                  blurTint="light"
                  variant="variant2"
                  overlayOpacity={0.2}
                  backgroundColor="transparent"
                >
                  <Paragraph
                    fontSize="$3"
                    fontWeight="400"
                    color="$color12"
                  >
                    {isSaving ? 'Saving...' : 'Continue'}
                  </Paragraph>
                </GlassButton>
                <Paragraph
                  fontSize="$3"
                  color="$color10"
                  textAlign="center"
                  maxWidth={280}
                >
                  Record or upload your video
                </Paragraph>
              </YStack>
            </YStack>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </GlassBackground>
  )
}
