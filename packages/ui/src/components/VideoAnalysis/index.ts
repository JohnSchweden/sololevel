// Shared types for VideoAnalysis feature
export type {
  PoseData,
  Joint,
  FeedbackMessage,
} from './types'

// Video Analysis UI Components - Explicit exports for better treeshaking
export { VideoControls } from './VideoControls/VideoControls'
export type {
  VideoControlsProps,
  VideoControlsRef,
  PersistentProgressBarProps,
} from './VideoControls/VideoControls'

export { ProgressBar } from './VideoControls/components/ProgressBar'
export type { ProgressBarProps } from './VideoControls/components/ProgressBar'

export { MotionCaptureOverlay } from './MotionCaptureOverlay/MotionCaptureOverlay'
export type { MotionCaptureOverlayProps } from './MotionCaptureOverlay/MotionCaptureOverlay'

export { FeedbackBubbles } from './FeedbackBubbles/FeedbackBubbles'
export type { FeedbackBubblesProps } from './FeedbackBubbles/FeedbackBubbles'

export { AudioFeedback } from './AudioFeedback/AudioFeedback'
export type { AudioFeedbackProps } from './AudioFeedback/AudioFeedback'

export { AudioPlayer } from './AudioPlayer/AudioPlayer'
export type { AudioPlayerProps } from './AudioPlayer/AudioPlayer'

export { VideoPlayer } from './VideoPlayer'
export type {
  VideoPlayerProps,
  VideoPlayerRef,
  OriginalVideoPlayerProps,
} from './types'

export { FeedbackPanel } from './FeedbackPanel/FeedbackPanel'
export type { FeedbackPanelProps, CommentItem } from './FeedbackPanel/FeedbackPanel'
export { VideoAnalysisInsights } from './FeedbackPanel/VideoAnalysisInsights'
export type {
  VideoAnalysisInsightsProps,
  VideoAnalysisInsightsOverview,
  VideoAnalysisInsightsFocusArea,
  VideoAnalysisInsightsHighlight,
  VideoAnalysisInsightsAction,
  VideoAnalysisInsightsAchievement,
} from './FeedbackPanel/VideoAnalysisInsights'
export { VideoAnalysisInsightsV2 } from './FeedbackPanel/VideoAnalysisInsightsV2'
export type {
  VideoAnalysisInsightsV2Props,
  VideoAnalysisInsightsV2Overview,
  VideoAnalysisInsightsV2Quote,
  VideoAnalysisInsightsV2FocusArea,
  VideoAnalysisInsightsV2SkillDimension,
  VideoAnalysisInsightsV2Highlight,
  VideoAnalysisInsightsV2Action,
  VideoAnalysisInsightsV2Achievement,
  VideoAnalysisInsightsV2Reel,
} from './FeedbackPanel/VideoAnalysisInsightsV2'

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
