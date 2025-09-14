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

// Inline type definitions for integration
interface PoseData {
  id: string
  timestamp: number
  joints: any[]
  confidence: number
}

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
  videoId: string
  initialStatus?: 'processing' | 'ready' | 'playing' | 'paused'
  onBack?: () => void
  onMenuPress?: () => void
}

export function VideoAnalysisScreen({
  initialStatus = 'ready',
  onBack,
  onMenuPress,
}: VideoAnalysisScreenProps) {
  // Screen state
  const [status, setStatus] = useState<'processing' | 'ready' | 'playing' | 'paused'>(initialStatus)
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [showControls, setShowControls] = useState(true)
  const [bottomSheetExpanded, setBottomSheetExpanded] = useState(false)
  const [activeTab, setActiveTab] = useState<'feedback' | 'insights' | 'comments'>('feedback')

  // Video and analysis data
  const [videoUri, setVideoUri] = useState<string | null>(null)
  const [title, setTitle] = useState<string | null>('Golf Swing Analysis')
  const [isTitleGenerating, setIsTitleGenerating] = useState(false)

  // Mock data for development
  const poseData: PoseData[] = []
  const feedbackMessages: FeedbackMessage[] = [
    {
      id: '1',
      timestamp: 1000,
      text: 'Great posture! Keep your back straight.',
      type: 'positive' as const,
      category: 'posture' as const,
      position: { x: 0.5, y: 0.3 },
      isHighlighted: true,
      isActive: true,
    },
    {
      id: '2',
      timestamp: 2000,
      text: 'Bend your knees a little bit for better stability.',
      type: 'suggestion' as const,
      category: 'movement' as const,
      position: { x: 0.7, y: 0.5 },
      isHighlighted: false,
      isActive: false,
    },
  ]

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

  // Simulate processing completion
  useEffect(() => {
    if (status === 'processing') {
      const interval = setInterval(() => {
        setProgress((prev: number) => {
          if (prev >= 1) {
            setStatus('ready')
            setVideoUri('https://example.com/sample-video.mp4') // Mock video URI
            clearInterval(interval)
            return 1
          }
          return prev + 0.1
        })
      }, 500)
      return () => clearInterval(interval)
    }
    // No-op for other states
    return
  }, [status])

  // Simulate title generation
  useEffect(() => {
    if (status === 'ready' && !title) {
      setIsTitleGenerating(true)
      setTimeout(() => {
        setTitle('Golf Swing Analysis')
        setIsTitleGenerating(false)
      }, 2000)
    }
  }, [status, title])

  const handlePlayPause = () => {
    setStatus(status === 'playing' ? 'paused' : 'playing')
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
        {status === 'processing' ? (
          <YStack
            flex={1}
            backgroundColor="$backgroundSubtle"
            justifyContent="center"
            alignItems="center"
          >
            <ProcessingOverlay
              progress={progress}
              currentStep="Processing video analysis..."
              estimatedTime={30}
              onCancel={() => setStatus('ready')}
              onViewResults={() => setStatus('ready')}
              isComplete={false}
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
                  isPlaying={status === 'playing'}
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
                poseData={poseData}
                isVisible={true}
              />

              <FeedbackBubbles
                messages={feedbackMessages}
                onBubbleTap={(message: FeedbackMessage) => console.log('Bubble tapped:', message)}
              />

              <AudioFeedbackOverlay
                audioUrl="https://example.com/audio.mp3"
                isPlaying={false}
                currentTime={0}
                duration={10}
                onPlayPause={() => console.log('Audio play/pause')}
                onClose={() => console.log('Close audio')}
                isVisible={false}
              />

              <VideoControlsOverlay
                isPlaying={status === 'playing'}
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
