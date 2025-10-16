import { YStack } from 'tamagui'
import { SettingsListItem } from '../SettingsListItem'

export interface SettingsNavItem {
  /**
   * Unique identifier for the item
   */
  id: string

  /**
   * Display label
   */
  label: string

  /**
   * Route path for navigation
   */
  route: string

  /**
   * Optional disabled state
   */
  disabled?: boolean
}

export interface SettingsNavigationListProps {
  /**
   * Array of navigation items to render
   */
  items: SettingsNavItem[]

  /**
   * Callback when an item is pressed
   * @param route - The route path to navigate to
   */
  onNavigate: (route: string) => void

  /**
   * Test ID for testing
   */
  testID?: string
}

/**
 * SettingsNavigationList Component
 *
 * Renders a vertical list of navigation items for settings screen.
 * Each item is a SettingsListItem with consistent spacing and styling.
 *
 * @example
 * ```tsx
 * <SettingsNavigationList
 *   items={[
 *     { id: 'account', label: 'Account', route: '/settings/account' },
 *     { id: 'security', label: 'Security', route: '/settings/security' },
 *   ]}
 *   onNavigate={(route) => router.push(route)}
 * />
 * ```
 */
export function SettingsNavigationList({
  items,
  onNavigate,
  testID = 'settings-navigation-list',
}: SettingsNavigationListProps): React.ReactElement {
  return (
    <YStack
      gap="$1"
      paddingHorizontal="$4"
      marginBottom="$6"
      testID={testID}
    >
      {items.map((item) => (
        <SettingsListItem
          key={item.id}
          label={item.label}
          onPress={() => onNavigate(item.route)}
          disabled={item.disabled}
          testID={`${testID}-item-${item.id}`}
        />
      ))}
    </YStack>
  )
}
