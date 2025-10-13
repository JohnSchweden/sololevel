// Platform-agnostic safe area hook for bottom navigation
const useSafeAreaInsets = () => {
  // Default safe area values for cross-platform compatibility
  return {
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  }
}

import { shadows } from '@my/config'
import { LinearGradient } from '@tamagui/linear-gradient'
import React from 'react'
import { Platform } from 'react-native'
import { Button, Text, XStack, YStack } from 'tamagui'
import type { BottomNavigationProps, NavigationTabProps } from './types'

/**
 * Bottom Navigation Component
 * Three-tab layout (Coach/Record/Insights) with active state management
 * Mobile-optimized with 44px touch targets and responsive sizing
 */
export function BottomNavigation({
  activeTab,
  onTabChange,
  disabled = false,
}: BottomNavigationProps) {
  return (
    <XStack
      flex={1}
      alignItems="center"
      justifyContent="space-between"
      paddingHorizontal="$2"
    >
      <NavigationTab
        label="Coach"
        isActive={activeTab === 'coach'}
        onPress={() => onTabChange('coach')}
        disabled={disabled}
      />

      <NavigationTab
        label="Record"
        isActive={activeTab === 'record'}
        onPress={() => onTabChange('record')}
        disabled={disabled}
      />

      <NavigationTab
        label="Insights"
        isActive={activeTab === 'insights'}
        onPress={() => onTabChange('insights')}
        disabled={disabled}
      />
    </XStack>
  )
}

/**
 * Individual Navigation Tab
 * Mobile-optimized with minimum 44px touch target and visual feedback
 */
function NavigationTab({ label, isActive, onPress, disabled = false }: NavigationTabProps) {
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
        opacity: 0.8,
      }}
      pressStyle={{
        scale: 0.98,
        backgroundColor: 'transparent',
      }}
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
      >
        <Text
          fontSize="$5"
          fontWeight={isActive ? '600' : '400'}
          color={isActive ? 'white' : '$whiteA70'}
          textAlign="center"
          numberOfLines={1}
        >
          {label}
        </Text>
      </YStack>
    </Button>
  )
}

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

/**
 * Centralized Bottom Navigation Container
 * Provides consistent bottom navigation styling and layout across the app
 * Mobile-optimized with safe area handling and touch targets
 * Features gradient from dark bottom to transparent top
 */
export function BottomNavigationContainer({
  children,
}: {
  children: React.ReactNode
}) {
  const insets = useSafeAreaInsets()

  return (
    <LinearGradient
      colors={['rgba(0, 0, 0, 0.7)', 'transparent']}
      locations={[0, 1]}
      start={{ x: 0.5, y: 1 }}
      end={{ x: 0.5, y: 0 }}
      position="absolute"
      bottom={0}
      left={0}
      right={0}
      paddingBottom={insets.bottom}
      height={72 + insets.bottom}
      paddingHorizontal="$4"
      alignItems="center"
      justifyContent="space-between"
      zIndex={10}
    >
      {children}
    </LinearGradient>
  )
}
