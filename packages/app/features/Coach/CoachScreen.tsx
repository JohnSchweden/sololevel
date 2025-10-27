import { useStaggeredAnimation } from '@app/hooks/useStaggeredAnimation'
import { useSafeArea } from '@app/provider/safe-area/use-safe-area'
import { log } from '@my/logging'
import {
  ChatInput,
  GlassBackground,
  MessageBubble,
  StateDisplay,
  SuggestionChip,
  TypingIndicator,
} from '@my/ui'
import { ChevronDown, ChevronUp, Sparkles, Target, Zap } from '@tamagui/lucide-icons'
import { BlurView } from 'expo-blur'
import { useRef, useState } from 'react'
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button, Image, ScrollView, Text, XStack, YStack } from 'tamagui'

export interface Message {
  id: string
  type: 'user' | 'coach'
  content: string
  timestamp: Date
}

export interface Suggestion {
  icon: typeof Sparkles
  text: string
  category: string
}

export interface CoachScreenProps {
  /**
   * Test ID for testing
   */
  testID?: string

  /**
   * Loading state
   */
  isLoading?: boolean

  /**
   * Error state
   */
  isError?: boolean

  /**
   * Error message
   */
  errorMessage?: string

  /**
   * Retry handler for error state
   */
  onRetry?: () => void

  /**
   * Optional session ID for coaching session context
   */
  sessionId?: number

  /**
   * Optional session title to display
   */
  sessionTitle?: string

  /**
   * Optional session date to display
   */
  sessionDate?: string

  /**
   * Optional initial messages to pre-populate chat
   */
  initialMessages?: Message[]

  /**
   * Whether this screen is used in a tab context (has bottom navigation)
   * @default true
   */
  hasBottomNavigation?: boolean
}

// Mock suggestions
const SUGGESTIONS: Suggestion[] = [
  { icon: Sparkles, text: 'Analyze my deadlift form', category: 'Form Analysis' },
  { icon: Target, text: 'Create a 30-day program', category: 'Programming' },
  { icon: Zap, text: 'Fix my squat technique', category: 'Technique' },
]

// Mock AI responses
const AI_RESPONSES = [
  "That's a great question! Based on your training history, I'd recommend focusing on form first. Let me break that down for you...",
  "I can see from your recent videos that you're making excellent progress! Here's what I noticed and some tips to optimize your technique:",
  "Perfect timing for this question! Your body mechanics show you're ready for the next level. Here's my recommendation:",
  "I love your dedication! Let's work on refining that movement pattern. Here's a step-by-step approach:",
  "Great observation! Your proprioception is improving. Let's build on that momentum with these specific cues:",
]

/**
 * CoachScreen Component
 *
 * Chat interface for AI coaching with message history, suggestions, and voice input.
 * Mobile-first design with glass background. Includes loading and error state handling.
 *
 * **Navigation Pattern (Expo Router Native):**
 * - Screen is framework-agnostic with no navigation imports
 * - Route file configures header via Tabs.Screen options
 * - All navigation logic isolated in route files
 *
 * @example
 * ```tsx
 * // Tab route (apps/expo/app/(tabs)/coach.tsx)
 * <CoachScreen
 *   isLoading={loading}
 *   isError={error}
 *   onRetry={refetch}
 *   hasBottomNavigation={true} // default
 * />
 *
 * // Stack route (apps/expo/app/coaching-session.tsx)
 * <CoachScreen
 *   sessionId={sessionData.id}
 *   sessionTitle={sessionData.title}
 *   sessionDate={sessionData.date}
 *   hasBottomNavigation={false} // no bottom tabs
 * />
 * ```
 */
export function CoachScreen({
  testID = 'coach-screen',
  isLoading = false,
  isError = false,
  errorMessage,
  onRetry,
  sessionId,
  sessionTitle,
  sessionDate,
  initialMessages,
  hasBottomNavigation = true,
}: CoachScreenProps = {}): React.ReactElement {
  // Hooks
  const insets = useSafeArea()
  const APP_HEADER_HEIGHT = 44 // Fixed height from AppHeader component

  // Format today's date for new sessions
  const getTodayDate = (): string => {
    const today = new Date()
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    }
    return today.toLocaleDateString('en-US', options)
  }

  // State
  const [messages, setMessages] = useState<Message[]>(
    initialMessages ?? [
      {
        id: '1',
        type: 'coach',
        content:
          "Hi there! I'm your Solo:Lvl coach. I'm here to help you improve your fitness technique, answer questions about your workouts, and provide personalized guidance. What would you like to work on today?",
        timestamp: new Date(),
      },
    ]
  )
  const [inputMessage, setInputMessage] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(!sessionId)
  const [scrollOffset, setScrollOffset] = useState(0)
  const { visibleItems: sectionsVisible } = useStaggeredAnimation({
    itemCount: 4,
    staggerDelay: 50,
    dependencies: [isLoading, isError],
  })
  const scrollViewRef = useRef<any>(null)
  const messageLayoutsRef = useRef<Map<string, { y: number; height: number }>>(new Map())

  // Handlers
  const sendMessage = (message?: string): void => {
    const messageToSend = message || inputMessage
    if (!messageToSend.trim() || isTyping) return

    // Add user message
    const newUserMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: messageToSend,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, newUserMessage])
    setInputMessage('')
    setIsTyping(true)

    // Simulate AI response
    setTimeout(
      () => {
        const coachResponse: Message = {
          id: (Date.now() + 1).toString(),
          type: 'coach',
          content: AI_RESPONSES[Math.floor(Math.random() * AI_RESPONSES.length)],
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, coachResponse])
        setIsTyping(false)

        // Scroll to bottom
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true })
        }, 100)
      },
      1500 + Math.random() * 1000
    )

    // Scroll to bottom after user message
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true })
    }, 100)
  }

  const handleSuggestionPress = (suggestion: string): void => {
    sendMessage(suggestion)
  }

  const handleVoiceToggle = (): void => {
    setIsListening(!isListening)
    log.info('CoachScreen', 'Voice toggle', { isListening: !isListening })
  }

  const handleVoiceMode = (): void => {
    log.info('CoachScreen', 'Voice mode activated')
  }

  const handleAttachment = (): void => {
    log.info('CoachScreen', 'Attachment button clicked')
  }

  const toggleSuggestions = (): void => {
    setShowSuggestions(!showSuggestions)
  }

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>): void => {
    setScrollOffset(event.nativeEvent.contentOffset.y)
  }

  const getMessageOpacity = (messageId: string): number => {
    // Only fade when scrolled up
    if (scrollOffset <= 0) return 1

    const layout = messageLayoutsRef.current.get(messageId)
    if (!layout) return 1

    // Calculate message position relative to viewport
    // Account for padding and header by measuring distance from content top
    const messageTop = layout.y - scrollOffset + insets.top + APP_HEADER_HEIGHT

    // Fade zone: start fading at header bottom (0px below header), fully faded when scrolled past
    const fadeStart = 100 // Start fading 20px below the header
    const fadeEnd = 0 // Fully faded 30px above header

    // Fully visible when below fade start
    if (messageTop >= fadeStart) {
      return 1
    }

    // Minimum opacity when at/above top
    if (messageTop <= fadeEnd) {
      return 0.2
    }

    // Smooth cubic fade between fadeStart and fadeEnd
    const progress = (messageTop - fadeEnd) / (fadeStart - fadeEnd)
    const eased = progress ** 3

    // Ensure opacity stays between 0.2 and 1
    return Math.max(0.2, Math.min(1, eased))
  }

  const handleMessageLayout = (messageId: string, y: number, height: number): void => {
    messageLayoutsRef.current.set(messageId, { y, height })
  }

  const handleContentSizeChange = (): void => {
    // Only auto-scroll if we have initial messages (previous session)
    if (initialMessages && initialMessages.length > 0) {
      scrollViewRef.current?.scrollToEnd({ animated: false })
    }
  }

  // State handling
  if (isLoading) {
    return (
      <GlassBackground
        backgroundColor="$color3"
        testID={testID}
      >
        <StateDisplay
          type="loading"
          title="Loading coach..."
          testID={`${testID}-loading`}
        />
      </GlassBackground>
    )
  }

  if (isError) {
    return (
      <GlassBackground
        backgroundColor="$color3"
        testID={testID}
      >
        <StateDisplay
          type="error"
          title="Failed to load coach"
          description={errorMessage || 'Please try again later or check your connection.'}
          icon="🤖"
          onRetry={onRetry}
          testID={`${testID}-error`}
        />
      </GlassBackground>
    )
  }

  return (
    <GlassBackground
      backgroundColor="$color3"
      testID={testID}
    >
      <SafeAreaView
        edges={['bottom']}
        style={{ flex: 1 }}
      >
        <YStack
          flex={1}
          testID={`${testID}-content`}
        >
          {/* Sticky Header Overlay */}
          <YStack
            position="absolute"
            //top={insets.top + APP_HEADER_HEIGHT}
            left={0}
            right={0}
            zIndex={10}
            //paddingVertical="$2"
            testID={`${testID}-sticky-header`}
          >
            <BlurView
              intensity={10}
              tint="regular"
              style={{
                borderRadius: 0,
                overflow: 'hidden',
                paddingTop: insets.top + APP_HEADER_HEIGHT,
                marginHorizontal: 1,
                marginTop: 0,
                borderBottomWidth: 1,
                borderBottomColor: 'rgba(255, 255, 255, 0.4)',
              }}
            >
              <XStack
                alignItems="center"
                padding="$4"
                gap="$4"
                paddingHorizontal="$6"
                opacity={sectionsVisible[0] ? 1 : 0}
                animation="quick"
                testID={`${testID}-avatar-section`}
              >
                {/* Avatar */}
                <YStack
                  width={64}
                  height={64}
                  borderRadius={32}
                  backgroundColor="$color5"
                  borderWidth={1}
                  borderColor="rgba(255,255,255,0.3)"
                  alignItems="center"
                  justifyContent="center"
                  overflow="hidden"
                  testID={`${testID}-avatar`}
                >
                  <Image
                    source={require('../../../../apps/expo/assets/coach_avatar.png')}
                    width={66}
                    height={66}
                    borderRadius={32}
                  />
                </YStack>

                {/* Session Info */}
                <YStack
                  flex={1}
                  gap="$2"
                  testID={`${testID}-session-info`}
                >
                  <Text
                    fontSize="$1"
                    fontWeight="500"
                    color="$color11"
                    testID={`${testID}-session-date`}
                  >
                    {sessionDate || getTodayDate()}
                  </Text>
                  <Text
                    fontSize="$4"
                    fontWeight="500"
                    color="$color12"
                    numberOfLines={2}
                    testID={`${testID}-session-title`}
                  >
                    {sessionTitle || 'New Coaching Session'}
                  </Text>
                </YStack>
              </XStack>
            </BlurView>
          </YStack>

          {/* Messages - Extended to top */}
          <YStack
            flex={1}
            opacity={sectionsVisible[1] ? 1 : 0}
            animation="quick"
            //paddingTop={insets.top + APP_HEADER_HEIGHT + 100} // Space for sticky header
          >
            <ScrollView
              ref={scrollViewRef}
              flex={1}
              paddingTop={insets.top + APP_HEADER_HEIGHT + 116}
              paddingHorizontal="$6"
              testID={`${testID}-messages`}
              contentContainerStyle={{
                flexGrow: 1,
                justifyContent: 'flex-end',
              }}
              onScroll={handleScroll}
              onContentSizeChange={handleContentSizeChange}
              scrollEventThrottle={16}
            >
              <YStack
                gap="$4"
                paddingBottom="$4"
              >
                {messages.map((message) => (
                  <XStack
                    key={message.id}
                    justifyContent={message.type === 'user' ? 'flex-end' : 'flex-start'}
                    opacity={getMessageOpacity(message.id)}
                    animation="lazy"
                    onLayout={(event) => {
                      const { y, height } = event.nativeEvent.layout
                      handleMessageLayout(message.id, y, height)
                    }}
                  >
                    <MessageBubble
                      type={message.type}
                      content={message.content}
                      timestamp={message.timestamp}
                    />
                  </XStack>
                ))}

                {isTyping && (
                  <XStack justifyContent="flex-start">
                    <TypingIndicator />
                  </XStack>
                )}
              </YStack>
            </ScrollView>
          </YStack>

          {/* Input Area */}
          <YStack
            marginHorizontal="$0.5"
            paddingHorizontal="$4"
            gap="$0"
            paddingBottom={hasBottomNavigation ? insets.bottom : -insets.bottom}
            backgroundColor="$color3"
            borderRadius="$9"
            testID={`${testID}-input-area`}
          >
            {/* Suggestions */}
            <YStack
              opacity={sectionsVisible[2] ? 1 : 0}
              animation="quick"
              testID={`${testID}-suggestions`}
            >
              {/* Suggestions Header */}
              <XStack
                justifyContent="space-between"
                alignItems="center"
              >
                <Button
                  onPress={toggleSuggestions}
                  chromeless
                  size="$5"
                  flex={1}
                  justifyContent="space-between"
                  alignItems="center"
                  paddingHorizontal="$4"
                  color="$color11"
                  iconAfter={showSuggestions ? ChevronDown : ChevronUp}
                  accessibilityLabel={showSuggestions ? 'Hide suggestions' : 'Show suggestions'}
                  testID={`${testID}-toggle-suggestions`}
                  animation="quick"
                  scale={1}
                  hoverStyle={{ scale: 1.05, backgroundColor: 'transparent' }}
                  pressStyle={{ scale: 0.95, backgroundColor: 'transparent' }}
                >
                  <Text
                    fontSize="$3"
                    color="$color11"
                  >
                    Suggestions
                  </Text>
                </Button>
              </XStack>

              {/* Suggestions List */}
              <YStack
                overflow="hidden"
                animation="quick"
                height={showSuggestions ? 'auto' : 0}
                opacity={showSuggestions ? 1 : 0}
              >
                <XStack
                  gap="$2"
                  flexWrap="wrap"
                  paddingTop="$1"
                  marginBottom="$2"
                >
                  {SUGGESTIONS.map((suggestion, index) => (
                    <SuggestionChip
                      key={index}
                      icon={suggestion.icon}
                      text={suggestion.text}
                      category={suggestion.category}
                      onPress={() => handleSuggestionPress(suggestion.text)}
                      disabled={isTyping}
                    />
                  ))}
                </XStack>
              </YStack>
            </YStack>

            {/* Chat Input */}
            <YStack
              opacity={sectionsVisible[3] ? 1 : 0}
              animation="quick"
            >
              <ChatInput
                value={inputMessage}
                onChange={setInputMessage}
                onSend={sendMessage}
                onAttachment={handleAttachment}
                onVoiceToggle={handleVoiceToggle}
                onVoiceMode={handleVoiceMode}
                isListening={isListening}
                disabled={isTyping}
                placeholder="Message your coach"
                testID={`${testID}-input`}
              />
            </YStack>

            {/* Helper Text */}
            {/* <XStack justifyContent="center">
              <Text
                fontSize="$2"
                color="rgba(255,255,255,0.4)"
                textAlign="center"
              >
                Press Enter to send • Shift+Enter for new line • Headphones for voice mode
              </Text>
            </XStack> */}
          </YStack>
        </YStack>
      </SafeAreaView>
    </GlassBackground>
  )
}
