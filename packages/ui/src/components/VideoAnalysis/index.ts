// Shared types for VideoAnalysis feature
export type {
  PoseData,
  Joint,
  FeedbackMessage,
} from './types'

// Video Analysis UI Components - Explicit exports for better treeshaking
export { ProcessingOverlay } from './ProcessingOverlay/ProcessingOverlay'
export type { ProcessingOverlayProps } from './ProcessingOverlay/ProcessingOverlay'

export { VideoControls } from './VideoControls/VideoControls'
export type { VideoControlsProps, VideoControlsRef } from './VideoControls/VideoControls'

export { MotionCaptureOverlay } from './MotionCaptureOverlay/MotionCaptureOverlay'
export type { MotionCaptureOverlayProps } from './MotionCaptureOverlay/MotionCaptureOverlay'

export { FeedbackBubbles } from './FeedbackBubbles/FeedbackBubbles'
export type { FeedbackBubblesProps } from './FeedbackBubbles/FeedbackBubbles'

export { AudioFeedback } from './AudioFeedback/AudioFeedback'
export type { AudioFeedbackProps } from './AudioFeedback/AudioFeedback'

export { VideoPlayer } from './VideoPlayer'
export type {
  VideoPlayerProps,
  OriginalVideoPlayerProps,
} from './types'

export { FeedbackPanel } from './FeedbackPanel/FeedbackPanel'
export type { FeedbackPanelProps } from './FeedbackPanel/FeedbackPanel'

export { FeedbackStatusIndicator } from './FeedbackStatusIndicator/FeedbackStatusIndicator'
export type { FeedbackStatusIndicatorProps } from './FeedbackStatusIndicator/FeedbackStatusIndicator'

export { FeedbackErrorHandler } from './FeedbackErrorHandler/FeedbackErrorHandler'
export type { FeedbackErrorHandlerProps } from './FeedbackErrorHandler/FeedbackErrorHandler'

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
