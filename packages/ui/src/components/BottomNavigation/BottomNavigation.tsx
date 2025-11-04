import { shadows } from '@my/config'
import React, { useCallback, useMemo } from 'react'
import { Platform } from 'react-native'

import { ProfilerWrapper } from '@ui/components/Performance'
import { AnimatePresence, Button, Text, XStack, YStack } from 'tamagui'
import { BottomNavigationContainer } from './BottomNavigationContainer'
import type { BottomNavigationProps, NavigationTabProps } from './types'

// Re-export the platform-specific BottomNavigationContainer
export { BottomNavigationContainer }

/**
 * Bottom Navigation Component
 * Three-tab layout (Coach/Record/Insights) with active state management
 * Mobile-optimized with 44px touch targets and responsive sizing
 */
export const BottomNavigation = React.memo(
  function BottomNavigation({ activeTab, onTabChange, disabled = false }: BottomNavigationProps) {
    // Note: Expo Router calls tabBarRenderer multiple times during navigation transitions.
    // This is expected behavior. React.memo with custom comparator prevents unnecessary
    // re-renders when props haven't changed.

    const tabs = ['coach', 'record', 'insights'] as const
    const activeIndex = tabs.indexOf(activeTab)

    // Memoize tab press handlers to prevent NavigationTab re-renders
    const handleCoachPress = useCallback(() => onTabChange('coach'), [onTabChange])
    const handleRecordPress = useCallback(() => onTabChange('record'), [onTabChange])
    const handleInsightsPress = useCallback(() => onTabChange('insights'), [onTabChange])

    // Memoize tab handlers map to prevent recreation
    const tabHandlers = useMemo(
      () => ({
        coach: handleCoachPress,
        record: handleRecordPress,
        insights: handleInsightsPress,
      }),
      [handleCoachPress, handleRecordPress, handleInsightsPress]
    )

    return (
      <ProfilerWrapper
        id="BottomNavigation"
        logToConsole={__DEV__}
      >
        <XStack
          flex={1}
          alignItems="center"
          justifyContent="space-between"
          paddingHorizontal="$2"
          position="relative"
        >
          {tabs.map((tab) => (
            <NavigationTab
              key={tab}
              label={tab.charAt(0).toUpperCase() + tab.slice(1)}
              isActive={activeTab === tab}
              onPress={tabHandlers[tab]}
              disabled={disabled}
            />
          ))}

          {/* Animated sliding border */}
          <AnimatePresence>
            <YStack
              key={`border-${activeTab}`}
              position="absolute"
              bottom={0}
              height={2}
              width="$4"
              backgroundColor="$color12"
              borderRadius="$2"
              animation={disabled ? undefined : 'bouncy'}
              left={`${activeIndex * 33.33 + 16.67}%`}
              transform={[{ translateX: -8 }]} // Center the border (half of width="$4")
              enterStyle={
                disabled
                  ? undefined
                  : {
                      opacity: 0,
                      scaleX: 0,
                      x: 0,
                    }
              }
              exitStyle={
                disabled
                  ? undefined
                  : {
                      opacity: 0,
                      scaleX: 0,
                      x: 0,
                    }
              }
            />
          </AnimatePresence>
        </XStack>
      </ProfilerWrapper>
    )
  },
  (prevProps, nextProps) => {
    // Custom comparator: only re-render if activeTab or disabled changes
    // onTabChange should be stable via useCallback in parent
    return (
      prevProps.activeTab === nextProps.activeTab &&
      prevProps.disabled === nextProps.disabled &&
      prevProps.onTabChange === nextProps.onTabChange
    )
  }
)

/**
 * Individual Navigation Tab
 * Mobile-optimized with minimum 44px touch target and visual feedback
 */
const NavigationTab = React.memo(function NavigationTab({
  label,
  isActive,
  onPress,
  disabled = false,
}: NavigationTabProps) {
  return (
    <Button
      flex={1}
      onPress={onPress}
      disabled={disabled}
      minHeight={44} // Touch target requirement
      paddingVertical="$2"
      paddingHorizontal="$1"
      backgroundColor="transparent"
      borderRadius="$3"
      hoverStyle={{
        backgroundColor: 'transparent',
        borderColor: 'transparent',
        opacity: 0.7,
        scale: 1.02,
      }}
      pressStyle={{
        scale: 0.92,
        backgroundColor: 'transparent',
        borderColor: 'transparent',
        opacity: 0.6,
      }}
      animation="bouncy"
      accessibilityRole="tab"
      // Use data attributes for testing instead of aria attributes
      data-testid={`${label.toLowerCase()}-tab`}
      data-active={isActive}
      // Include accessibility attributes for screen readers
      aria-label={`${label} tab`}
      aria-selected={isActive}
      // Also include native accessibility for React Native compatibility
      accessibilityState={Platform.OS !== 'web' ? { selected: isActive } : undefined}
      accessibilityLabel={Platform.OS !== 'web' ? `${label} tab` : undefined}
    >
      <YStack
        alignItems="center"
        justifyContent="flex-end"
        //marginBottom="$1"
      >
        <Text
          fontSize="$5"
          fontWeight={isActive ? '600' : '400'}
          color={isActive ? '$color12' : '$whiteA70'}
          textAlign="center"
          numberOfLines={1}
          animation="bouncy"
          animateOnly={['color', 'fontWeight']}
        >
          {label}
        </Text>
      </YStack>
      {/* Border line below text - only visible when active */}
      {/* {isActive && (
          <AnimatePresence>
          <YStack
            height={3}
            position='absolute'
            width="$4"
            backgroundColor="$color"
            borderRadius="$1"
            marginTop="$10"
            alignSelf="center"

          />
          </AnimatePresence>
                  )
                  } */}
    </Button>
  )
})

export interface TabBarProps {
  children: React.ReactNode
}

/**
 * Reusable Tab Bar Container
 * Can be used for other tab navigation implementations
 */
export function TabBar({ children }: TabBarProps) {
  return (
    <XStack
      height={80}
      backgroundColor="$background"
      borderTopWidth={1}
      borderTopColor="$borderColor"
      paddingHorizontal="$4"
      alignItems="center"
      justifyContent="space-between"
      {...shadows.small}
    >
      {children}
    </XStack>
  )
}
