import {
  GlassBackground,
  SettingsNavigationItem,
  SettingsSectionHeader,
  SettingsToggleItem,
} from '@my/ui'
import { useHeaderHeight } from '@react-navigation/elements'
import { Database, Download, Trash2 } from '@tamagui/lucide-icons'
import { useNavigation, useRouter } from 'expo-router'
import { useLayoutEffect, useState } from 'react'
import { Button, ScrollView, Text, YStack } from 'tamagui'
import type { NavAppHeaderOptions } from '../../components/navigation'

export interface DataControlsScreenProps {
  /**
   * Optional callback for data export action (for testing/dependency injection)
   */
  onDataExport?: () => void

  /**
   * Optional callback for clear all data action (for testing/dependency injection)
   */
  onClearAllData?: () => void

  /**
   * Test ID for testing
   */
  testID?: string
}

/**
 * DataControlsScreen Component
 *
 * Data controls settings screen with data sharing preferences, export, and deletion options.
 * Following SecurityScreen pattern with GlassBackground and AppHeader configuration.
 *
 * @example
 * ```tsx
 * <DataControlsScreen />
 * ```
 */
export function DataControlsScreen({
  onDataExport,
  onClearAllData,
  testID = 'data-controls-screen',
}: DataControlsScreenProps = {}): React.ReactElement {
  const navigation = useNavigation()
  const router = useRouter()
  const headerHeight = useHeaderHeight()

  // Local state for data controls (P1: Move to Zustand store)
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true)
  const [crashReportsEnabled, setCrashReportsEnabled] = useState(true)

  // Configure AppHeader: Back button on left, no right action
  useLayoutEffect(() => {
    navigation.setOptions({
      appHeaderProps: {
        title: 'Data Controls',
        mode: 'default',
        leftAction: 'back',
        rightAction: 'none',
        onBackPress: () => router.back(),
      },
    } as NavAppHeaderOptions)
  }, [navigation, router])

  return (
    <GlassBackground
      backgroundColor="$color3"
      testID={testID}
    >
      <ScrollView flex={1}>
        <YStack
          flex={1}
          position="relative"
          paddingTop={headerHeight + 30}
          paddingHorizontal="$4"
          gap="$6"
        >
          {/* Data Sharing Section */}
          <YStack>
            <SettingsSectionHeader
              icon={Database}
              title="Data Sharing"
            />
            <YStack gap="$4">
              <SettingsToggleItem
                icon={Database}
                iconColor="$blue10"
                iconBackground="$blue3"
                iconBorder="$blue5"
                title="Analytics Data"
                description="Share app usage data to improve experience"
                value={analyticsEnabled}
                onValueChange={setAnalyticsEnabled}
                testID="settings-toggle-item-analytics"
              />
              <SettingsToggleItem
                icon={Database}
                iconColor="$blue10"
                iconBackground="$blue3"
                iconBorder="$blue5"
                title="Crash Reports"
                description="Automatically send crash reports"
                value={crashReportsEnabled}
                onValueChange={setCrashReportsEnabled}
                testID="settings-toggle-item-crash-reports"
              />
            </YStack>
          </YStack>

          {/* Data Export Section */}
          <YStack>
            <SettingsSectionHeader
              icon={Download}
              title="Data Export"
            />
            <SettingsNavigationItem
              icon={Download}
              iconColor="$blue10"
              iconBackgroundColor="$blue3"
              iconBorderColor="$blue5"
              title="Export Data"
              subtitle="Download all your personal data"
              onPress={onDataExport || (() => {})}
              testID="settings-navigation-item-export"
            />
          </YStack>

          {/* Data Deletion Section */}
          <YStack
            gap="$3"
            marginBottom="$8"
          >
            <SettingsSectionHeader
              icon={Trash2}
              title="Data Deletion"
            />
            <Text
              fontSize="$3"
              color="$red11"
              paddingHorizontal="$4"
            >
              This will permanently delete all your app data including preferences, history, and
              saved items.
            </Text>
            <Button
              backgroundColor="$red3"
              borderColor="$red6"
              borderWidth={1}
              color="$red11"
              icon={Trash2}
              size="$4"
              onPress={onClearAllData || (() => {})}
              pressStyle={{
                backgroundColor: '$red4',
                scale: 0.98,
              }}
              hoverStyle={{
                backgroundColor: '$red4',
              }}
              testID="button-clear-all-data"
            >
              Clear All Data
            </Button>
          </YStack>
        </YStack>
      </ScrollView>
    </GlassBackground>
  )
}
