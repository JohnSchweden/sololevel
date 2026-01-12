/**
 * Avatar Asset Mapping
 * Maps avatar asset keys from voice config to bundled image assets
 */

/**
 * Valid avatar asset keys from voice config
 */
export type AvatarAssetKey =
  | 'female_roast'
  | 'male_roast'
  | 'female_zen'
  | 'male_zen'
  | 'female_lovebomb'
  | 'male_lovebomb'

/**
 * Default avatar key used when no specific key is provided
 */
export const DEFAULT_AVATAR_KEY: AvatarAssetKey = 'female_roast'

/**
 * Avatar asset mapping
 * Maps avatar asset keys to bundled image resources
 */
export const AVATAR_ASSETS: Record<AvatarAssetKey, any> = {
  female_roast: require('../../../../apps/expo/assets/coach_female_roast.webp'),
  male_roast: require('../../../../apps/expo/assets/coach_male_roast.webp'),
  female_zen: require('../../../../apps/expo/assets/coach_female_zen.webp'),
  male_zen: require('../../../../apps/expo/assets/coach_male_zen.webp'),
  female_lovebomb: require('../../../../apps/expo/assets/coach_female_lovebomb.webp'),
  male_lovebomb: require('../../../../apps/expo/assets/coach_male_lovebomb.webp'),
}
