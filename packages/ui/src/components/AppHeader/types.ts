import type { ReactNode } from 'react'
import type { ThemeName } from 'tamagui'

// Generic app states that can be handled by the header
export type AppHeaderMode =
  | 'default'
  | 'camera'
  | 'camera-idle'
  | 'recording'
  | 'analysis'
  | 'videoSettings'

export type AppHeaderLeftAction = 'auto' | 'back' | 'sidesheet' | 'none'

export type AppHeaderRightAction =
  | 'auto'
  | 'menu'
  | 'notifications'
  | 'videoSettings'
  | 'profile'
  | 'none'

export interface AppHeaderProps {
  title: string
  mode?: AppHeaderMode

  showTimer?: boolean
  timerValue?: string
  onMenuPress?: () => void
  onBackPress?: () => void
  onNotificationPress?: () => void
  onProfilePress?: () => void
  notificationBadgeCount?: number
  titleAlignment?: 'center' | 'left'
  leftAction?: AppHeaderLeftAction
  rightAction?: AppHeaderRightAction
  leftSlot?: ReactNode
  rightSlot?: ReactNode
  titleSlot?: ReactNode
  tintColor?: string
  themeName?: ThemeName
  // Profile props
  profileImageUri?: string
  // Mode-specific props
  cameraProps?: {
    isRecording?: boolean
  }
}
