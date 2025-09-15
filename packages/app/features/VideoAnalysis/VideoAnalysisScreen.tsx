import { ChevronLeft, MoreVertical } from '@tamagui/lucide-icons'
import { useEffect, useState } from 'react'
import { Button, XStack, YStack } from 'tamagui'

// UI Components from @my/ui
import { ProcessingOverlay } from '@my/ui'
import { VideoAnalysisPlayer } from '@my/ui'
import { MotionCaptureOverlay } from '@my/ui'
import { FeedbackBubbles } from '@my/ui'
import { AudioFeedbackOverlay } from '@my/ui'
import { VideoControlsOverlay } from '@my/ui'
import { BottomSheet } from '@my/ui'
import { SocialIcons } from '@my/ui'
import { VideoTitle } from '@my/ui'

// Real-time integration hooks
import { useVideoAnalysisRealtime } from '../../hooks/useAnalysisRealtime'
import { useAnalysisJobStatus } from '../../stores/analysisStatus'

// API services
import { useQuery } from '@tanstack/react-query'
// Mock API services for now - will be implemented in Phase 3
const getAnalysisJob = (_id: number) => Promise.resolve(null)
const getAnalysisResults = (_job: any) => null

// Error handling components
import { ConnectionErrorBanner } from '../../components/ConnectionErrorBanner'

// Inline type definitions for integration

interface FeedbackMessage {
  id: string
  timestamp: number
  text: string
  type: 'positive' | 'suggestion' | 'correction'
  category: 'posture' | 'movement' | 'grip' | 'voice'
  position: { x: number; y: number }
  isHighlighted: boolean
  isActive: boolean
}

interface FeedbackItem {
  id: string
  timestamp: number
  text: string
  type: 'positive' | 'suggestion' | 'correction'
  category: 'posture' | 'movement' | 'grip' | 'voice'
}

interface SocialStats {
  likes: number
  comments: number
  bookmarks: number
  shares: number
}

export interface VideoAnalysisScreenProps {
  analysisJobId: number
  videoRecordingId?: number
  initialStatus?: 'processing' | 'ready' | 'playing' | 'paused'
  onBack?: () => void
  onMenuPress?: () => void
}

export function VideoAnalysisScreen({
  analysisJobId,
  // videoRecordingId and initialStatus are available but not used in current implementation
  onBack,
  onMenuPress,
}: VideoAnalysisScreenProps) {
  // Real-time integration
  const realtimeData = useVideoAnalysisRealtime(analysisJobId)
  const jobStatus = useAnalysisJobStatus(analysisJobId)

  // Fetch analysis job data
  const { data: analysisJob } = useQuery({
    queryKey: ['analysis', analysisJobId],
    queryFn: () => getAnalysisJob(analysisJobId),
    enabled: !!analysisJobId,
  })

  // Screen state
  const [currentTime, setCurrentTime] = useState(0)
  const [showControls, setShowControls] = useState(true)
  const [bottomSheetExpanded, setBottomSheetExpanded] = useState(false)
  const [activeTab, setActiveTab] = useState<'feedback' | 'insights' | 'comments'>('feedback')

  // Derived state from real-time data
  const status = jobStatus.isProcessing
    ? 'processing'
    : jobStatus.isCompleted
      ? 'ready'
      : jobStatus.isFailed
        ? 'ready'
        : 'processing'

  // Local state for playback control
  const [isPlaying, setIsPlaying] = useState(false)
  const progress = jobStatus.progress / 100
  const videoUri = (analysisJob as any)?.video_recordings?.filename || null
  const [title, setTitle] = useState<string | null>(null)
  const [isTitleGenerating, setIsTitleGenerating] = useState(false)

  // Real data from analysis results
  const analysisResults = jobStatus.results ? getAnalysisResults(jobStatus.job!) : null
  const poseData = realtimeData.poseHistory || []
  const currentPose = realtimeData.currentPose

  // Transform analysis results to feedback messages
  const feedbackMessages: FeedbackMessage[] =
    (analysisResults as any)?.recommendations?.map((rec: any, index: number) => ({
      id: `feedback-${index}`,
      timestamp: (index + 1) * 1000, // Distribute across video timeline
      text: rec.message,
      type:
        rec.priority === 'high'
          ? 'correction'
          : rec.priority === 'medium'
            ? 'suggestion'
            : 'positive',
      category: rec.type as 'posture' | 'movement' | 'grip' | 'voice',
      position: { x: 0.5 + (index % 2) * 0.2, y: 0.3 + (index % 3) * 0.2 },
      isHighlighted: rec.priority === 'high',
      isActive: false,
    })) || []

  const [socialStats, setSocialStats] = useState<
    Omit<SocialStats, 'onLike' | 'onComment' | 'onBookmark' | 'onShare'>
  >({
    likes: 1100,
    comments: 13,
    bookmarks: 1100,
    shares: 224,
  })

  const feedbackItems: FeedbackItem[] = [
    {
      id: '1',
      timestamp: 1000,
      text: 'Great posture! Keep your back straight and maintain good balance.',
      type: 'positive' as const,
      category: 'posture' as const,
    },
    {
      id: '2',
      timestamp: 2000,
      text: 'Try bending your knees slightly for better stability.',
      type: 'suggestion' as const,
      category: 'movement' as const,
    },
    {
      id: '3',
      timestamp: 3000,
      text: 'Grip the club more firmly with your left hand.',
      type: 'correction' as const,
      category: 'grip' as const,
    },
  ]

  // Update title from analysis results
  useEffect(() => {
    if ((analysisResults as any)?.summary_text && !title) {
      setIsTitleGenerating(true)
      // Extract title from summary or generate from analysis type
      const generatedTitle =
        (analysisResults as any).summary_text.split('.')[0] || 'Analysis Complete'
      setTimeout(() => {
        setTitle(generatedTitle)
        setIsTitleGenerating(false)
      }, 1000)
    }
  }, [analysisResults, title])

  // Connection error handling state
  const [showConnectionError, setShowConnectionError] = useState(false)

  // Handle connection status changes
  useEffect(() => {
    if (!realtimeData.isConnected && realtimeData.connectionError) {
      setShowConnectionError(true)
    } else if (realtimeData.isConnected) {
      setShowConnectionError(false)
    }
  }, [realtimeData.isConnected, realtimeData.connectionError])

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying)
  }

  const handleSeek = (time: number) => {
    setCurrentTime(time)
  }

  const handleVideoTap = () => {
    setShowControls(true)
    // Auto-hide after 3 seconds
    setTimeout(() => setShowControls(false), 3000)
  }

  const handleTitleEdit = (newTitle: string) => {
    setTitle(newTitle)
  }

  const handleFeedbackItemPress = (item: FeedbackItem) => {
    // Seek to the timestamp of the feedback item
    setCurrentTime(item.timestamp / 1000)
  }

  const handleSocialAction = (action: 'like' | 'comment' | 'bookmark' | 'share') => {
    setSocialStats((prev) => ({
      ...prev,
      [action === 'like'
        ? 'likes'
        : action === 'comment'
          ? 'comments'
          : action === 'bookmark'
            ? 'bookmarks'
            : 'shares']:
        prev[
          action === 'like'
            ? 'likes'
            : action === 'comment'
              ? 'comments'
              : action === 'bookmark'
                ? 'bookmarks'
                : 'shares'
        ] + 1,
    }))
  }

  return (
    <YStack
      flex={1}
      backgroundColor="$background"
    >
      {/* Header */}
      <XStack
        height={60}
        paddingHorizontal="$4"
        alignItems="center"
        backgroundColor="$color2"
        testID="video-analysis-header"
      >
        <Button
          chromeless
          size={44}
          icon={ChevronLeft}
          onPress={onBack}
          testID="back-button"
        />
        <YStack flex={1} />
        <VideoTitle
          title={title}
          isGenerating={isTitleGenerating}
          onTitleEdit={handleTitleEdit}
          timestamp="2 days ago"
        />
        <YStack flex={1} />
        <Button
          chromeless
          size={44}
          icon={MoreVertical}
          onPress={onMenuPress}
          testID="menu-button"
        />
      </XStack>

      {/* Video Area */}
      <YStack
        flex={1}
        position="relative"
        backgroundColor="$color1"
      >
        {/* Connection Error Banner */}
        <ConnectionErrorBanner
          isVisible={showConnectionError}
          error={realtimeData.connectionError}
          reconnectAttempts={realtimeData.reconnectAttempts}
          onRetry={() => {
            // Trigger reconnection by resubscribing
            setShowConnectionError(false)
          }}
          onDismiss={() => setShowConnectionError(false)}
        />
        {status === 'processing' ? (
          <YStack
            flex={1}
            backgroundColor="$backgroundSubtle"
            justifyContent="center"
            alignItems="center"
          >
            <ProcessingOverlay
              progress={progress}
              currentStep={
                jobStatus.isProcessing
                  ? 'Processing video analysis...'
                  : jobStatus.isFailed
                    ? 'Analysis failed'
                    : 'Analysis complete'
              }
              estimatedTime={jobStatus.isProcessing ? 30 : 0}
              onCancel={() => onBack?.()}
              onViewResults={() => {
                /* Analysis complete, already showing results */
              }}
              isComplete={jobStatus.isCompleted}
            />
          </YStack>
        ) : (
          <>
            {/* Video Player */}
            <YStack
              flex={1}
              onPress={handleVideoTap}
              testID="video-player-container"
            >
              {videoUri && (
                <VideoAnalysisPlayer
                  videoUri={videoUri}
                  isPlaying={isPlaying}
                  currentTime={currentTime}
                  duration={0}
                  showControls={showControls}
                  onPlay={handlePlayPause}
                  onPause={handlePlayPause}
                  onSeek={handleSeek}
                  poseData={poseData}
                  feedbackMessages={feedbackMessages}
                  audioUrl={null}
                  isAudioPlaying={false}
                  onAudioPlayPause={() => {}}
                  onAudioSeek={() => {}}
                  onAudioClose={() => {}}
                  onFeedbackBubbleTap={(message: FeedbackMessage) =>
                    console.log('Bubble tapped:', message)
                  }
                />
              )}

              {/* Overlays */}
              <MotionCaptureOverlay
                poseData={currentPose ? [currentPose] : poseData}
                isVisible={jobStatus.isCompleted && !!currentPose}
              />

              <FeedbackBubbles
                messages={feedbackMessages}
                onBubbleTap={(message: FeedbackMessage) => console.log('Bubble tapped:', message)}
              />

              <AudioFeedbackOverlay
                audioUrl={(analysisJob as any)?.audio_url || null}
                isPlaying={false}
                currentTime={0}
                duration={10}
                onPlayPause={() => console.log('Audio play/pause')}
                onClose={() => console.log('Close audio')}
                isVisible={!!(analysisJob as any)?.audio_url}
              />

              <VideoControlsOverlay
                isPlaying={isPlaying}
                currentTime={currentTime}
                duration={0}
                showControls={showControls}
                onPlay={handlePlayPause}
                onPause={handlePlayPause}
                onSeek={handleSeek}
              />

              <SocialIcons
                likes={socialStats.likes}
                comments={socialStats.comments}
                bookmarks={socialStats.bookmarks}
                shares={socialStats.shares}
                onLike={() => handleSocialAction('like')}
                onComment={() => handleSocialAction('comment')}
                onBookmark={() => handleSocialAction('bookmark')}
                onShare={() => handleSocialAction('share')}
                isVisible={bottomSheetExpanded}
              />
            </YStack>
          </>
        )}

        {/* Bottom Sheet */}
        <BottomSheet
          isExpanded={bottomSheetExpanded}
          activeTab={activeTab}
          feedbackItems={feedbackItems}
          socialStats={socialStats}
          onTabChange={setActiveTab}
          onSheetExpand={() => setBottomSheetExpanded(true)}
          onSheetCollapse={() => setBottomSheetExpanded(false)}
          onFeedbackItemPress={handleFeedbackItemPress}
          onLike={() => handleSocialAction('like')}
          onComment={() => handleSocialAction('comment')}
          onBookmark={() => handleSocialAction('bookmark')}
          onShare={() => handleSocialAction('share')}
        />
      </YStack>
    </YStack>
  )
}
