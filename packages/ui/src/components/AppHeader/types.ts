// Generic app states that can be handled by the header
export type AppHeaderMode =
  | 'default'
  | 'camera'
  | 'camera-idle'
  | 'recording'
  | 'analysis'
  | 'videoSettings'

export interface AppHeaderProps {
  title: string
  mode?: AppHeaderMode
  showTimer?: boolean
  timerValue?: string
  onMenuPress?: () => void
  onBackPress?: () => void
  onNotificationPress?: () => void
  notificationBadgeCount?: number
  // Mode-specific props
  cameraProps?: {
    isRecording?: boolean
  }
}
