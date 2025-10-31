/**
 * Animation timing hook that provides conditional animation durations and names
 * based on the type of user interaction.
 *
 * Implements the Option 3 conditional timing strategy:
 * - User tap → 'quick' (200ms)
 * - Auto hide → 'lazy' (400ms)
 * - Playback end → 'quick' (200ms)
 */

export type AnimationInteractionType = 'user-tap' | 'auto-hide' | 'playback-end'
export type TamaguiAnimationName = 'quick' | 'lazy'

/**
 * Animation duration constants aligned with Tamagui animation configurations
 *
 * @property quick - Fast animation for user interactions (damping: 20, stiffness: 250, mass: 1.2) → ~200ms
 * @property lazy - Slower animation for auto-hide (damping: 18, stiffness: 50) → ~400ms
 */
export const CONDITIONAL_ANIMATION_DURATIONS = {
  quick: 200,
  lazy: 400,
} as const

/**
 * Mapping of interaction types to animation names
 */
const INTERACTION_TO_ANIMATION: Record<AnimationInteractionType, TamaguiAnimationName> = {
  'user-tap': 'quick',
  'auto-hide': 'lazy',
  'playback-end': 'quick',
}

/**
 * Mapping of interaction types to animation durations (milliseconds)
 */
const INTERACTION_TO_DURATION: Record<AnimationInteractionType, number> = {
  'user-tap': CONDITIONAL_ANIMATION_DURATIONS.quick,
  'auto-hide': CONDITIONAL_ANIMATION_DURATIONS.lazy,
  'playback-end': CONDITIONAL_ANIMATION_DURATIONS.quick,
}

/**
 * Hook providing conditional animation timing based on interaction type.
 *
 * Returns helper functions to get the appropriate animation name and duration
 * for different types of user interactions with video controls.
 *
 * @example
 * ```tsx
 * const { getAnimationName, getAnimationDuration } = useConditionalAnimationTiming()
 *
 * // For user tap
 * const animName = getAnimationName('user-tap') // 'quick'
 * const duration = getAnimationDuration('user-tap') // 200
 * ```
 *
 * @returns Object containing animation name and duration getter functions
 */
export function useConditionalAnimationTiming(): {
  getAnimationName: (interactionType: AnimationInteractionType) => TamaguiAnimationName
  getAnimationDuration: (interactionType: AnimationInteractionType) => number
} {
  /**
   * Get the Tamagui animation name for a given interaction type
   *
   * @param interactionType - Type of user interaction
   * @returns Tamagui animation name ('quick' or 'lazy')
   */
  const getAnimationName = (interactionType: AnimationInteractionType): TamaguiAnimationName => {
    return INTERACTION_TO_ANIMATION[interactionType]
  }

  /**
   * Get the estimated animation duration for a given interaction type
   *
   * @param interactionType - Type of user interaction
   * @returns Animation duration in milliseconds
   */
  const getAnimationDuration = (interactionType: AnimationInteractionType): number => {
    return INTERACTION_TO_DURATION[interactionType]
  }

  return {
    getAnimationName,
    getAnimationDuration,
  }
}
