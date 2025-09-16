// Shared types for VideoAnalysis feature
export type {
  PoseData,
  Joint,
  FeedbackMessage,
} from './types'

// Video Analysis UI Components - Explicit exports for better treeshaking
export { ProcessingOverlay } from './ProcessingOverlay/ProcessingOverlay'
export type { ProcessingOverlayProps } from './ProcessingOverlay/ProcessingOverlay'

export { VideoControlsOverlay } from './VideoControlsOverlay/VideoControlsOverlay'
export type { VideoControlsOverlayProps } from './VideoControlsOverlay/VideoControlsOverlay'

export { MotionCaptureOverlay } from './MotionCaptureOverlay/MotionCaptureOverlay'
export type { MotionCaptureOverlayProps } from './MotionCaptureOverlay/MotionCaptureOverlay'

export { FeedbackBubbles } from './FeedbackBubbles/FeedbackBubbles'
export type { FeedbackBubblesProps } from './FeedbackBubbles/FeedbackBubbles'

export { AudioFeedbackOverlay } from './AudioFeedbackOverlay/AudioFeedbackOverlay'
export type { AudioFeedbackOverlayProps } from './AudioFeedbackOverlay/AudioFeedbackOverlay'

export { VideoPlayer } from './VideoPlayer'
export type {
  VideoPlayerProps,
  OriginalVideoPlayerProps,
} from './types'

export { BottomSheet } from './BottomSheet/BottomSheet'
export type { BottomSheetProps } from './BottomSheet/BottomSheet'

export { SocialIcons } from './SocialIcons/SocialIcons'
export type { SocialIconsProps } from './SocialIcons/SocialIcons'

export { VideoTitle } from './VideoTitle/VideoTitle'
export type { VideoTitleProps } from './VideoTitle/VideoTitle'

export { CoachAvatar } from './CoachAvatar/CoachAvatar'
export type { CoachAvatarProps } from './CoachAvatar/CoachAvatar'

export {
  VideoContainer,
  VideoPlayerArea,
  VideoPositioningOverlay,
} from './VideoContainer/VideoContainer'
export type {
  VideoContainerProps,
  VideoPlayerAreaProps,
  VideoPositioningOverlayProps,
} from './VideoContainer/VideoContainer'
