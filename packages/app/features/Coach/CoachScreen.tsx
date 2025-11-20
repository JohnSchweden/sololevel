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
import { BlurView } from '@my/ui'
import { ChevronDown, ChevronUp, Sparkles, Target, Zap } from '@tamagui/lucide-icons'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FlatList, type FlatListProps, type ListRenderItem, Platform } from 'react-native'
import Animated, {
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button, Image, Text, XStack, YStack } from 'tamagui'

// Create animated FlatList for Reanimated compatibility
const AnimatedFlatList = Animated.createAnimatedComponent<FlatListProps<Message>>(FlatList)

// Stable style objects for button animations (prevent re-renders)
// Note: Button color prop controls text/icon color, pressStyle color doesn't override Text children
const TOGGLE_BUTTON_HOVER_STYLE = { scale: 1.02, backgroundColor: 'transparent' } as const
const TOGGLE_BUTTON_PRESS_STYLE = {
  scale: 0.98,
  backgroundColor: 'transparent',
  opacity: 0.8,
} as const

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
 * Format today's date for new sessions
 * Defined outside component to prevent new function reference on every render
 */
const getTodayDate = (): string => {
  const today = new Date()
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  }
  return today.toLocaleDateString('en-US', options)
}

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
  // PERF: Measure render duration to surface slow renders in development
  // const renderStartTime = __DEV__ ? performance.now() : 0

  // Hooks
  const insetsRaw = useSafeArea()
  const APP_HEADER_HEIGHT = 44 // Fixed height from AppHeader component
  const BOTTOM_TAB_BAR_HEIGHT = Platform.OS === 'android' ? 52 : 62 // Fixed height from BottomNavigationContainer

  // ROOT CAUSE FIX #1: useSafeAreaInsets returns NEW object reference every render
  // Memoize insets based on content to prevent re-renders when values haven't changed
  const insets = useMemo(
    () => insetsRaw,
    [insetsRaw.top, insetsRaw.bottom, insetsRaw.left, insetsRaw.right]
  )

  // ROOT CAUSE FIX #2: Inline object literals in JSX create new references every render
  // Memoize style objects to prevent child component re-renders
  const safeAreaViewStyle = useMemo(() => ({ flex: 1 }), [])
  const blurViewStyle = useMemo(
    () => ({
      borderRadius: 0,
      overflow: 'hidden' as const,
      paddingTop: insets.top + APP_HEADER_HEIGHT,
      marginHorizontal: 1,
      marginTop: 0,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(255, 255, 255, 0.4)',
    }),
    [insets.top]
  )

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
  const [isSuggestionsButtonPressed, setIsSuggestionsButtonPressed] = useState(false)
  // Reanimated shared value for suggestions slide animation (1 = visible, 0 = hidden)
  // Initialize based on sessionId: expanded for new sessions, collapsed for existing sessions
  const suggestionsProgress = useSharedValue(!sessionId ? 1 : 0)
  const flatListRef = useRef<FlatList<Message>>(null)

  // Simple visibility check - show all sections when not loading/error
  const sectionsVisible = useMemo(() => {
    const isVisible = !isLoading && !isError
    return [isVisible, isVisible, isVisible, isVisible]
  }, [isLoading, isError])

  // Handlers - wrapped in useCallback to prevent child component re-renders
  const sendMessage = useCallback(
    (message?: string): void => {
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
        },
        1000 + Math.random() * 1000
      )
    },
    [inputMessage, isTyping]
  )

  const handleSuggestionPress = useCallback(
    (suggestion: string): void => {
      sendMessage(suggestion)
    },
    [sendMessage]
  )

  const handleVoiceToggle = useCallback((): void => {
    setIsListening((prev) => {
      const newValue = !prev
      log.info('CoachScreen', 'Voice toggle', { isListening: newValue })
      return newValue
    })
  }, [])

  const handleVoiceMode = useCallback((): void => {
    log.info('CoachScreen', 'Voice mode activated')
  }, [])

  const handleAttachment = useCallback((): void => {
    log.info('CoachScreen', 'Attachment button clicked')
  }, [])

  const toggleSuggestions = useCallback((): void => {
    setShowSuggestions((prev) => {
      const newValue = !prev
      // Defer shared value update to avoid writing during render phase
      // setTimeout(0) defers to next event loop tick, after render completes
      setTimeout(() => {
        suggestionsProgress.value = withTiming(newValue ? 1 : 0, {
          duration: 300,
        })
      }, 0)
      return newValue
    })
  }, []) // suggestionsProgress is stable, no need in deps

  // LAZY INITIALIZATION FIX: Register listener for suggestionsProgress before any writes
  // This ensures the listener exists before useEffect writes to it on mount
  useAnimatedReaction(
    () => suggestionsProgress.value,
    () => {
      // Dummy listener - ensures suggestionsProgress is registered before useEffect writes to it
    }
  )

  // Sync shared value with showSuggestions state
  // On mount: set synchronously without animation
  // After mount: animate transitions
  const isMountedRef = useRef(false)
  useEffect(() => {
    if (!isMountedRef.current) {
      isMountedRef.current = true
      // Initial mount: set synchronously without animation
      suggestionsProgress.value = showSuggestions ? 1 : 0
      return
    }
    // Subsequent changes: animate
    suggestionsProgress.value = withTiming(showSuggestions ? 1 : 0, {
      duration: 300,
    })
  }, [showSuggestions, suggestionsProgress])

  // Animated style for suggestions slide-in/slide-out effect
  const suggestionsAnimatedStyle = useAnimatedStyle(() => {
    'worklet'
    // Slide up from bottom (translateY: 0 when visible, positive when hidden)
    // Opacity fades in/out
    const translateY = (1 - suggestionsProgress.value) * 50 // Slide up 50px when hidden
    const opacity = suggestionsProgress.value
    const isVisible = suggestionsProgress.value > 0.01

    return {
      transform: [{ translateY }],
      opacity,
      // Use maxHeight instead of height: 'auto' (not supported in Reanimated)
      // Set to large value when visible, 0 when hidden
      maxHeight: isVisible ? 1000 : 0,
      overflow: 'hidden' as const,
      pointerEvents: isVisible ? ('auto' as const) : ('none' as const),
    }
  })

  // Memoized renderItem to prevent re-renders
  const renderMessageItem = useCallback<ListRenderItem<Message>>(
    ({ item: message }) => (
      <XStack
        justifyContent={message.type === 'user' ? 'flex-end' : 'flex-start'}
        marginBottom="$4"
      >
        <MessageBubble
          type={message.type}
          content={message.content}
          timestamp={message.timestamp}
        />
      </XStack>
    ),
    []
  )

  // Memoized keyExtractor
  const keyExtractor = useCallback((item: Message) => item.id, [])

  // Reverse messages for inverted FlatList (newest at bottom, oldest at top)
  const reversedMessages = useMemo(() => [...messages].reverse(), [messages])

  // useEffect(() => {
  //   if (__DEV__) {
  //     const renderDuration = performance.now() - renderStartTime
  //     if (renderDuration > 16) {
  //       log.warn('CoachScreen', `Slow render: ${renderDuration.toFixed(2)}ms`, {
  //         stack: new Error('CoachScreen slow render').stack ?? undefined,
  //       })
  //     }
  //   }
  // })

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
        edges={[]}
        style={safeAreaViewStyle}
      >
        <YStack
          flex={1}
          paddingBottom={
            hasBottomNavigation
              ? BOTTOM_TAB_BAR_HEIGHT // Tab context: tab bar height + safe area
              : sessionId
                ? insets.bottom // Coaching session: account for safe area only
                : 0 // New session without tabs: no bottom padding needed
          }
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
              style={blurViewStyle}
            >
              <XStack
                alignItems="center"
                padding="$4"
                gap="$4"
                paddingHorizontal="$6"
                opacity={sectionsVisible[0] ? 1 : 0}
                // ROOT CAUSE FIX: Remove Tamagui animation to prevent animation frame re-renders
                // Staggered animation already handles visibility timing
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
                    color="$color12"
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
            // ROOT CAUSE FIX: Remove Tamagui animation to prevent animation frame re-renders
            // Staggered animation already handles visibility timing
            //paddingTop={insets.top + APP_HEADER_HEIGHT + 100} // Space for sticky header
          >
            <AnimatedFlatList
              ref={flatListRef}
              data={reversedMessages}
              keyExtractor={keyExtractor}
              renderItem={renderMessageItem}
              ListHeaderComponent={
                isTyping ? (
                  <XStack
                    justifyContent="flex-start"
                    marginBottom="$4"
                  >
                    <TypingIndicator />
                  </XStack>
                ) : null
              }
              contentContainerStyle={{
                paddingTop: 16, // $4 = 16px (bottom padding when inverted)
                paddingHorizontal: 24, // $6 = 24px
                paddingBottom: insets.top + APP_HEADER_HEIGHT + 116, // Top padding when inverted
              }}
              style={{ flex: 1 }}
              testID={`${testID}-messages`}
              inverted={true}
            />
          </YStack>

          {/* Input Area */}
          <YStack
            marginHorizontal="$0.5"
            paddingHorizontal="$4"
            gap="$0"
            paddingBottom={0}
            backgroundColor="$color3"
            borderTopLeftRadius="$9"
            borderTopRightRadius="$9"
            testID={`${testID}-input-area`}
          >
            {/* Suggestions */}
            <YStack
              opacity={sectionsVisible[2] ? 1 : 0}
              // ROOT CAUSE FIX: Remove Tamagui animation to prevent animation frame re-renders
              // Staggered animation already handles visibility timing
              testID={`${testID}-suggestions`}
            >
              {/* Suggestions Header */}
              <XStack
                justifyContent="space-between"
                alignItems="center"
              >
                <Button
                  onPress={toggleSuggestions}
                  onPressIn={() => setIsSuggestionsButtonPressed(true)}
                  onPressOut={() => setIsSuggestionsButtonPressed(false)}
                  chromeless
                  size="$5"
                  flex={1}
                  justifyContent="space-between"
                  alignItems="center"
                  paddingHorizontal="$4"
                  color={isSuggestionsButtonPressed ? '$color11' : '$color12'}
                  opacity={isSuggestionsButtonPressed ? 1 : 0.8}
                  iconAfter={showSuggestions ? ChevronDown : ChevronUp}
                  accessibilityLabel={showSuggestions ? 'Hide suggestions' : 'Show suggestions'}
                  testID={`${testID}-toggle-suggestions`}
                  // ROOT CAUSE FIX: Remove Tamagui animation to prevent animation frame re-renders
                  scale={1}
                  hoverStyle={TOGGLE_BUTTON_HOVER_STYLE}
                  pressStyle={TOGGLE_BUTTON_PRESS_STYLE}
                >
                  <Text
                    fontSize="$3"
                    color={isSuggestionsButtonPressed ? '$color11' : '$color12'}
                  >
                    Suggestions
                  </Text>
                </Button>
              </XStack>

              {/* Suggestions List - Reanimated slide animation */}
              <Animated.View style={suggestionsAnimatedStyle}>
                <YStack
                  overflow="hidden"
                  paddingTop="$0"
                  marginBottom="$2"
                >
                  <XStack
                    gap="$2"
                    flexWrap="wrap"
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
              </Animated.View>
            </YStack>

            {/* Chat Input */}
            <YStack
              opacity={sectionsVisible[3] ? 1 : 0}
              // ROOT CAUSE FIX: Remove Tamagui animation to prevent animation frame re-renders
              // Staggered animation already handles visibility timing
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

// Enable why-did-you-render tracking for performance debugging
if (__DEV__) {
  CoachScreen.whyDidYouRender = true
}
