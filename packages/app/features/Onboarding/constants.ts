/**
 * Onboarding Constants
 * Mode and gender options for voice selection
 */

import type { CoachGender, CoachMode } from '@my/api'

export interface ModeOption {
  value: CoachMode
  label: string
  description: string
  isHumoristic?: boolean
}

export interface GenderOption {
  value: CoachGender
  label: string
}

/**
 * Mode options for voice selection
 * Roast:Me is marked as humoristic per spec
 */
export const MODE_OPTIONS: readonly ModeOption[] = [
  {
    value: 'roast',
    label: 'Roast:Me ⭐',
    description: 'Brutal honesty with biting humor',
    isHumoristic: true,
  },
  {
    value: 'zen',
    label: 'Zen:Me 🧘',
    description: 'Calm, encouraging guidance',
  },
  {
    value: 'lovebomb',
    label: 'Lovebomb:Me 💖',
    description: 'Lovable positivity',
  },
] as const

/**
 * Gender options for voice selection
 */
export const GENDER_OPTIONS: readonly GenderOption[] = [
  {
    value: 'female',
    label: 'Female',
  },
  {
    value: 'male',
    label: 'Male',
  },
] as const

/**
 * Default preferences (female + roast per spec)
 */
export const DEFAULT_PREFERENCES = {
  gender: 'female' as CoachGender,
  mode: 'roast' as CoachMode,
} as const
