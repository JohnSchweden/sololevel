// Core Tamagui exports
export * from 'tamagui'
// Temporarily disabled due to createStyledContext issues in tests
// export * from '@tamagui/toast'

// Configuration
export { config } from '@my/config'

// Lightweight, high-traffic components (curated public API)
export { Button } from './components/Button'
export { GlassButton } from './components/GlassButton'
export { ToastProvider } from './components/ToastProvider'
export { ToastViewport } from './components/ToastViewport'
export { AppHeader } from './components/AppHeader'
export { BlurView } from './components/BlurView/BlurView'
export type { BlurViewProps } from './components/BlurView/BlurView'
export {
  BottomNavigation,
  BottomNavigationContainer,
} from './components/BottomNavigation/BottomNavigation'
export { GlassBackground } from './components/GlassBackground'

// Settings Components
export { ProfileSection } from './components/Settings/ProfileSection'
export type { ProfileSectionProps } from './components/Settings/ProfileSection'
export { SettingsListItem } from './components/Settings/SettingsListItem'
export type { SettingsListItemProps } from './components/Settings/SettingsListItem'
export { SettingsNavigationList } from './components/Settings/SettingsNavigationList'
export type {
  SettingsNavigationListProps,
  SettingsNavItem,
} from './components/Settings/SettingsNavigationList'
export { SettingsNavigationItem } from './components/Settings/SettingsNavigationItem'
export type { SettingsNavigationItemProps } from './components/Settings/SettingsNavigationItem'
export { SettingsSectionHeader } from './components/Settings/SettingsSectionHeader'
export type {
  SettingsSectionHeaderProps,
  SettingsSectionHeaderVariant,
} from './components/Settings/SettingsSectionHeader'
export { SettingsToggleItem } from './components/Settings/SettingsToggleItem'
export type { SettingsToggleItemProps } from './components/Settings/SettingsToggleItem'
export { SettingsSelectItem } from './components/Settings/SettingsSelectItem'
export type {
  SettingsSelectItemOption,
  SettingsSelectItemProps,
} from './components/Settings/SettingsSelectItem'
export { SettingsRadioGroup } from './components/Settings/SettingsRadioGroup'
export type { SettingsRadioGroupProps, ThemeValue } from './components/Settings/SettingsRadioGroup'
export { AuthenticationSection } from './components/Security/AuthenticationSection'
export type { AuthenticationSectionProps } from './components/Security/AuthenticationSection'
export { SessionManagementSection } from './components/Security/SessionManagementSection'
export type { SessionManagementSectionProps } from './components/Security/SessionManagementSection'
export { LogOutButton } from './components/Settings/LogOutButton'
export type { LogOutButtonProps } from './components/Settings/LogOutButton'
export { SettingsFooter } from './components/Settings/SettingsFooter'
export type { SettingsFooterProps, FooterLinkType } from './components/Settings/SettingsFooter'

// Insights Components
export { StatCard } from './components/Insights/StatCard'
export type { StatCardProps } from './components/Insights/StatCard'
export { Progress } from './components/Insights/Progress'
export type { ProgressProps } from './components/Insights/Progress'
export { Badge } from './components/Insights/Badge'
export type { BadgeProps } from './components/Insights/Badge'
export { ActivityChart } from './components/Insights/ActivityChart'
export type { ActivityChartProps, ActivityData } from './components/Insights/ActivityChart'
export { AchievementCard } from './components/Insights/AchievementCard'
export type { AchievementCardProps } from './components/Insights/AchievementCard'
export { FocusCard } from './components/Insights/FocusCard'
export type { FocusCardProps } from './components/Insights/FocusCard'

// Feedback Components
export { FeedbackTypeButton } from './components/Feedback'
export type { FeedbackTypeButtonProps } from './components/Feedback'

// Form Components
export { TextArea } from './components/Form'
export type { TextAreaProps } from './components/Form'

// Coach Components
export { ChatInput, MessageBubble, SuggestionChip, TypingIndicator } from './components/Coach'
export type {
  ChatInputProps,
  MessageBubbleProps,
  SuggestionChipProps,
  TypingIndicatorProps,
} from './components/Coach'

// Dialog Components
export { ConfirmDialog } from './components/ConfirmDialog'
export type { ConfirmDialogProps } from './components/ConfirmDialog'

// State Display Components
export { StateDisplay } from './components/StateDisplay'
export type { StateDisplayProps } from './components/StateDisplay'

// Loading Components
export { CircularSpinner } from './components/CircularSpinner'
export type { CircularSpinnerProps } from './components/CircularSpinner'

// Hooks
export { useToastController } from './hooks/useToastController'

// Native-specific exports
export * from './NativeToast'

// Utilities (keep these as they're lightweight)

// Video utilities (keep these as they're lightweight)
export * from './utils/videoValidation'

// NOTE: Heavy components like VideoAnalysis and CameraRecording are NOT exported from root.
// Import them via subpaths: `@my/ui/components/VideoAnalysis/VideoPlayer`
// This prevents dev/build performance issues and improves treeshaking.

// Test utilities are NOT exported from main package to avoid production bundling
// Import them directly in test files: import { render, screen } from '@my/ui/test-utils'
