import { useStableSafeArea } from '@app/provider/safe-area/use-safe-area'
import {
  GlassBackground,
  GlassButton,
  SettingsNavigationItem,
  SettingsSectionHeader,
  SettingsToggleItem,
} from '@my/ui'
import { AlertTriangle, Database, Download, LineChart, Trash2 } from '@tamagui/lucide-icons'
import { useMemo, useState } from 'react'
import { View } from 'react-native'
import { ScrollView, Text, XStack, YStack } from 'tamagui'

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
  // Use stable safe area hook that properly memoizes insets
  const insets = useStableSafeArea()
  const APP_HEADER_HEIGHT = 44 // Fixed height from AppHeader component

  // PERF FIX: Memoize container style to prevent recalculating layout on every render
  const containerStyle = useMemo(() => ({ flex: 1 as const }), [])

  // Local state for data controls (P1: Move to Zustand store)
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true)
  const [crashReportsEnabled, setCrashReportsEnabled] = useState(true)

  return (
    <GlassBackground
      backgroundColor="$color3"
      testID={testID}
    >
      <View style={containerStyle}>
        <ScrollView flex={1}>
          <YStack
            paddingTop={insets.top + APP_HEADER_HEIGHT + 20}
            paddingHorizontal="$4"
            gap="$6"
            paddingBottom={insets.bottom + 24}
          >
            {/* Data Sharing Section */}
            <YStack>
              <SettingsSectionHeader
                icon={Database}
                title="Data Sharing"
              />
              <YStack gap="$4">
                <SettingsToggleItem
                  icon={LineChart}
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
                  icon={AlertTriangle}
                  iconColor="$red10"
                  iconBackground="$red3"
                  iconBorder="$red5"
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
              <YStack
                paddingHorizontal="$4"
                gap="$3"
              >
                <Text
                  fontSize="$3"
                  color="$red11"
                >
                  This will permanently delete all your app data including preferences, history, and
                  saved items.
                </Text>
                <GlassButton
                  onPress={onClearAllData || (() => {})}
                  testID="button-clear-all-data"
                  accessibilityLabel="Clear all data"
                  minHeight={44}
                  minWidth="100%"
                  borderRadius="$4"
                  borderWidth={1.1}
                  borderColor="$red10"
                  blurIntensity={0}
                  blurTint="light"
                  variant="variant2"
                  overlayOpacity={0.2}
                >
                  <XStack
                    alignItems="center"
                    justifyContent="center"
                    gap="$2"
                  >
                    <Trash2
                      size={16}
                      color="$red11"
                    />
                    <Text
                      fontSize="$3"
                      fontWeight="400"
                      color="$red11"
                      testID="clear-all-data-text"
                    >
                      Clear All Data
                    </Text>
                  </XStack>
                </GlassButton>
              </YStack>
            </YStack>
          </YStack>
        </ScrollView>
      </View>
    </GlassBackground>
  )
}
