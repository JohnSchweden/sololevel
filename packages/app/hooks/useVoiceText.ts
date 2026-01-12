import { useVoicePreferencesStore } from '@app/stores/voicePreferences'
import { VOICE_TEXT_CONFIG, type VoiceTextConfig } from '@my/config'

/**
 * Hook to access voice mode-specific UI text
 *
 * Reads the user's selected coaching mode (roast/zen/lovebomb) from the voice preferences store
 * and returns the corresponding text configuration.
 *
 * @returns VoiceTextConfig for the current mode (defaults to 'roast' if not set)
 *
 * @example
 * ```tsx
 * const voiceText = useVoiceText()
 * const welcomeMessage = voiceText.coach.welcomeMessage
 * const header = voiceText.insights.weeklySectionHeader
 * ```
 */
export function useVoiceText(): VoiceTextConfig {
  const mode = useVoicePreferencesStore((s) => s.mode)
  // Default to 'roast' if mode is undefined (matches existing behavior)
  return VOICE_TEXT_CONFIG[mode || 'roast']
}
