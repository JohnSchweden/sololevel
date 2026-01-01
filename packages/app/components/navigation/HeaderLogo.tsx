import { OptimizedImage as Image } from '@my/ui'
import { type ReactElement, useMemo } from 'react'
import { YStack } from 'tamagui'

/**
 * Header Logo Component
 *
 * Shared logo component for app headers. Used in both static (layout) and dynamic (screen) contexts.
 * Prevents duplication and ensures consistent styling across header implementations.
 *
 * @example
 * ```tsx
 * // In _layout.tsx (static)
 * const recordHeaderLogo = useMemo(() => <HeaderLogo />, [])
 *
 * // In record.tsx (dynamic)
 * const headerLogo = useMemo(() => <HeaderLogo />, [])
 * ```
 */
export function HeaderLogo(): ReactElement {
  return (
    <YStack
      paddingBottom={4}
      alignItems="center"
      justifyContent="center"
    >
      <Image
        source={require('../../../../apps/expo/assets/icon_sololevel_header.png')}
        contentFit="contain"
        style={{
          height: 36,
          width: 132,
        }}
        cachePolicy="memory-disk"
        transition={200}
        accessibilityLabel="Solo:Level"
        testID="header-logo"
      />
    </YStack>
  )
}

/**
 * Memoized header logo for use in useMemo hooks
 * Prevents recreation on every render while maintaining stable reference
 */
export function useHeaderLogo(): ReactElement {
  return useMemo(() => <HeaderLogo />, [])
}
