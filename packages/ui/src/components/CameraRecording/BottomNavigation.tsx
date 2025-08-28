import React from 'react'
import { Button, Text, XStack, YStack } from 'tamagui'

export interface BottomNavigationProps {
  activeTab: 'coach' | 'record' | 'insights'
  onTabChange: (tab: 'coach' | 'record' | 'insights') => void
  disabled?: boolean
}

export interface NavigationTabProps {
  label: string
  isActive: boolean
  onPress: () => void
  disabled?: boolean
}

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
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={`${label} tab`}
    >
      <YStack
        alignItems="center"
        justifyContent="flex-end"
      >
        <Text
          fontSize={16}
          fontWeight={isActive ? '700' : '500'}
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
      shadowColor="$shadowColor"
      shadowOffset={{ width: 0, height: -2 }}
      shadowOpacity={0.1}
      shadowRadius={4}
      elevation={4}
    >
      {children}
    </XStack>
  )
}
