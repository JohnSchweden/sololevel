/**
 * Avatar Assets Mapping
 * Maps avatar asset keys to bundled image resources
 *
 * Keys follow the pattern: {gender}_{mode}
 * - gender: 'male' | 'female'
 * - mode: 'roast' | 'zen' | 'lovebomb'
 */

export const AVATAR_ASSETS = {
  female_roast: require('../../../../../apps/expo/assets/coach_female_roast.webp'),
  male_roast: require('../../../../../apps/expo/assets/coach_male_roast.webp'),
  female_zen: require('../../../../../apps/expo/assets/coach_female_zen.webp'),
  male_zen: require('../../../../../apps/expo/assets/coach_male_zen.webp'),
  female_lovebomb: require('../../../../../apps/expo/assets/coach_female_lovebomb.webp'),
  male_lovebomb: require('../../../../../apps/expo/assets/coach_male_lovebomb.webp'),
} as const

export type AvatarAssetKey = keyof typeof AVATAR_ASSETS

export const DEFAULT_AVATAR_KEY: AvatarAssetKey = 'female_roast'
