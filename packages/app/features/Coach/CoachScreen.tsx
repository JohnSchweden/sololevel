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
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import Animated, {
  type SharedValue,
  useAnimatedReaction,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Button, Image, Text, XStack, YStack } from 'tamagui'

// Stable style objects for button animations (prevent re-renders)
// Note: Button color prop controls text/icon color, pressStyle color doesn't override Text children
const TOGGLE_BUTTON_HOVER_STYLE = { scale: 1.02, backgroundColor: 'transparent' } as const
const TOGGLE_BUTTON_PRESS_STYLE = {
  scale: 0.98,
  backgroundColor: 'transparent',
  opacity: 0.8,
} as const

// ROOT CAUSE FIX: AnimatedMessageWrapper defined outside component to prevent recreation on every render
// This ensures React doesn't treat it as a new component type on each render
interface AnimatedMessageWrapperProps {
  messageId: string
  children: React.ReactNode
  scrollOffset: SharedValue<number>
  messageLayoutsShared: React.MutableRefObject<
    Map<string, { y: SharedValue<number>; height: SharedValue<number> }>
  >
}

// ROOT CAUSE FIX: AnimatedMessageWrapper reads layout from shared values in map
// Each wrapper creates its own shared values, registers them in the map, and reads from them
const AnimatedMessageWrapper = ({
  messageId,
  children,
  scrollOffset,
  messageLayoutsShared,
}: AnimatedMessageWrapperProps) => {
  // Create shared values for this message - these are the actual values we'll read
  const layoutY = useSharedValue(0)
  const layoutHeight = useSharedValue(0)

  // Register shared values in map so layout handler can update them
  useLayoutEffect(() => {
    messageLayoutsShared.current.set(messageId, { y: layoutY, height: layoutHeight })
    return () => {
      messageLayoutsShared.current.delete(messageId)
    }
  }, [messageId, layoutY, layoutHeight, messageLayoutsShared])

  // LAZY INITIALIZATION FIX: Register listeners for shared values before they're written to
  // This prevents "onAnimatedValueUpdate with no listeners" warnings
  // The values are written by layout handlers before useAnimatedStyle might register
  useAnimatedReaction(
    () => layoutY.value,
    () => {
      // Dummy listener - ensures layoutY is registered before onLayout writes to it
    }
  )
  useAnimatedReaction(
    () => layoutHeight.value,
    () => {
      // Dummy listener - ensures layoutHeight is registered before onLayout writes to it
    }
  )

  const animatedStyle = useAnimatedStyle(() => {
    'worklet'
    const fadeStart = 100
    const fadeEnd = 0

    // LAZY INITIALIZATION FIX: Always read shared values to ensure listener registration
    // Even if we early return, accessing .value registers the listener
    const currentScrollOffset = scrollOffset.value
    const currentLayoutY = layoutY.value
    // Read to register listener, value not used
    void layoutHeight.value

    // If not scrolled, all messages are fully visible
    if (currentScrollOffset <= 0) {
      return { opacity: 1 }
    }

    // ROOT CAUSE FIX: layoutY.value starts at 0 until onLayout fires
    // If layout hasn't been measured yet, keep it fully visible
    if (currentLayoutY === 0) {
      return { opacity: 1 }
    }

    // Calculate message position relative to viewport top
    // layoutY = message's Y position in scroll content (from onLayout, includes content padding)
    // scrollOffset = how far user has scrolled (content offset from top)
    //
    // ROOT CAUSE FIX: onLayout gives Y relative to content container (includes paddingTop)
    // To get viewport-relative position, we need: layoutY - scrollOffset
    // The header is outside the ScrollView viewport, so we don't need to account for it here
    const messageTop = currentLayoutY - currentScrollOffset

    // Messages below fadeStart (100px from viewport top) are fully visible
    if (messageTop >= fadeStart) {
      return { opacity: 1 }
    }
    // Messages at/above fadeEnd (0px from viewport top) are minimum opacity
    if (messageTop <= fadeEnd) {
      return { opacity: 0.2 }
    }
    // Messages between fadeEnd and fadeStart fade smoothly
    const progress = (messageTop - fadeEnd) / (fadeStart - fadeEnd)
    const eased = progress ** 3
    return { opacity: Math.max(0.2, Math.min(1, eased)) }
  })

  return <Animated.View style={animatedStyle}>{children}</Animated.View>
}

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
  // Hooks
  const insetsRaw = useSafeArea()
  const APP_HEADER_HEIGHT = 44 // Fixed height from AppHeader component

  // ROOT CAUSE FIX #1: useSafeAreaInsets returns NEW object reference every render
  // Memoize insets based on content to prevent re-renders when values haven't changed
  const insets = useMemo(
    () => insetsRaw,
    [insetsRaw.top, insetsRaw.bottom, insetsRaw.left, insetsRaw.right]
  )

  // ROOT CAUSE FIX #2: Inline object literals in JSX create new references every render
  // Memoize style objects to prevent child component re-renders
  const safeAreaViewStyle = useMemo(() => ({ flex: 1 }), [])
  const scrollViewContentStyle = useMemo(
    () => ({
      flexGrow: 1,
      justifyContent: 'flex-end' as const,
    }),
    []
  )
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
  // ROOT CAUSE FIX: Use Reanimated shared value for scroll offset to prevent React re-renders
  // This moves opacity calculations to UI thread, eliminating animation frame re-renders
  const scrollOffset = useSharedValue(0)

  // LAZY INITIALIZATION FIX: Register listener for scrollOffset before scroll handler writes
  // The scroll handler writes immediately, so we need the listener registered first
  useAnimatedReaction(
    () => scrollOffset.value,
    () => {
      // Dummy listener - ensures scrollOffset is registered before scroll handler writes to it
    }
  )
  // Reanimated shared value for suggestions slide animation (1 = visible, 0 = hidden)
  // Initialize with 0 to avoid writing to shared value during render
  const suggestionsProgress = useSharedValue(0)
  const { visibleItems: sectionsVisibleRaw } = useStaggeredAnimation({
    itemCount: 4,
    staggerDelay: 50,
    dependencies: [isLoading, isError],
  })
  const scrollViewRef = useRef<any>(null)
  const messageLayoutsRef = useRef<Map<string, { y: number; height: number }>>(new Map())

  // Stabilize sectionsVisible array reference - only create new reference when content changes
  // This prevents re-renders when useStaggeredAnimation creates new array references with same content
  const sectionsVisibleSignature = useMemo(
    () => JSON.stringify(sectionsVisibleRaw),
    [sectionsVisibleRaw]
  )
  const prevSectionsVisibleRef = useRef<boolean[]>(sectionsVisibleRaw)
  const prevSignatureRef = useRef<string>(sectionsVisibleSignature)
  const sectionsVisible = useMemo(() => {
    // Only create new reference if content actually changed
    if (sectionsVisibleSignature === prevSignatureRef.current) {
      return prevSectionsVisibleRef.current // Return cached reference
    }
    // Content changed - update cache and return new reference
    prevSignatureRef.current = sectionsVisibleSignature
    prevSectionsVisibleRef.current = sectionsVisibleRaw
    return sectionsVisibleRaw
  }, [sectionsVisibleRaw, sectionsVisibleSignature])

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

          // Scroll to bottom
          setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true })
          }, 100)
        },
        1000 + Math.random() * 1000
      )

      // Scroll to bottom after user message
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true })
      }, 100)
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

  // ROOT CAUSE FIX: Use Reanimated scroll handler - runs on UI thread, no React re-renders
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      // Update shared value directly on UI thread - no React re-render
      scrollOffset.value = event.contentOffset.y
    },
  })

  // ROOT CAUSE FIX: Store header offset as shared value for Reanimated worklet
  // Initialize with 0 to avoid accessing state during render
  const headerOffsetShared = useSharedValue(0)

  // LAZY INITIALIZATION FIX: Register listener for headerOffsetShared to prevent warnings
  // This shared value is written but may not be read immediately
  useAnimatedReaction(
    () => headerOffsetShared.value,
    () => {
      // Dummy listener - ensures headerOffsetShared is registered before useEffect writes to it
    }
  )

  // Update header offset when insets change (must be in useEffect to avoid render-phase writes)
  useEffect(() => {
    headerOffsetShared.value = insets.top + APP_HEADER_HEIGHT
  }, [insets.top, headerOffsetShared])

  // ROOT CAUSE FIX: Store message layouts as shared values to avoid React re-renders
  // Layout updates go directly to shared values, Reanimated reads from them on UI thread
  // Use a ref to store shared values - they're created per-message in AnimatedMessageWrapper
  const messageLayoutsShared = useRef<
    Map<string, { y: SharedValue<number>; height: SharedValue<number> }>
  >(new Map())

  // AnimatedMessageWrapper is now defined outside component to prevent recreation on every render

  // messageOpacities removed - Reanimated handles opacity on UI thread

  // ROOT CAUSE FIX: Layout handler updates shared values directly - NO React re-renders
  // Reanimated reads from shared values on UI thread, so layout updates don't trigger component re-renders
  // Note: Shared values are pre-created during render, so we just update their .value here
  const handleMessageLayout = useCallback((messageId: string, y: number, height: number): void => {
    // Only update if layout actually changed to prevent unnecessary work
    const existing = messageLayoutsRef.current.get(messageId)
    if (existing && existing.y === y && existing.height === height) {
      return // No change, skip update
    }

    // Update ref for diagnostics
    messageLayoutsRef.current.set(messageId, { y, height })

    // Update shared values directly - shared values are pre-created during render
    const layoutShared = messageLayoutsShared.current.get(messageId)
    if (layoutShared) {
      layoutShared.y.value = y
      layoutShared.height.value = height
    }
    // If layoutShared doesn't exist, it means the message was just added and will be initialized on next render
  }, [])

  // ROOT CAUSE FIX: Memoize layout handlers per message to prevent new function references
  // New function references cause XStack to re-render, which triggers layout measurements
  // Layout measurements can cascade, causing multiple re-renders (84-97 in logs)
  const layoutHandlersRef = useRef<Map<string, (event: any) => void>>(new Map())
  const getLayoutHandler = useCallback(
    (messageId: string) => {
      if (!layoutHandlersRef.current.has(messageId)) {
        layoutHandlersRef.current.set(messageId, (event: any) => {
          const { y, height } = event.nativeEvent.layout
          handleMessageLayout(messageId, y, height)
        })
      }
      return layoutHandlersRef.current.get(messageId)!
    },
    [handleMessageLayout]
  )

  // Clean up handlers for removed messages
  useEffect(() => {
    const currentMessageIds = new Set(messages.map((m) => m.id))
    const handlerMessageIds = Array.from(layoutHandlersRef.current.keys())

    handlerMessageIds.forEach((id) => {
      if (!currentMessageIds.has(id)) {
        layoutHandlersRef.current.delete(id)
      }
    })
  }, [messages])

  const handleContentSizeChange = useCallback((): void => {
    // Only auto-scroll if we have initial messages (previous session)
    if (initialMessages && initialMessages.length > 0) {
      scrollViewRef.current?.scrollToEnd({ animated: false })
    }
  }, [initialMessages])

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
        style={safeAreaViewStyle}
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
            <Animated.ScrollView
              ref={scrollViewRef}
              style={{ flex: 1 }}
              contentContainerStyle={[
                scrollViewContentStyle,
                {
                  paddingTop: insets.top + APP_HEADER_HEIGHT + 116,
                  paddingHorizontal: 24, // $6 = 24px
                },
              ]}
              testID={`${testID}-messages`}
              onScroll={scrollHandler}
              scrollEventThrottle={16}
              onContentSizeChange={handleContentSizeChange}
            >
              <YStack
                gap="$4"
                paddingBottom="$4"
              >
                {messages.map((message) => (
                  <AnimatedMessageWrapper
                    key={message.id}
                    messageId={message.id}
                    scrollOffset={scrollOffset}
                    messageLayoutsShared={messageLayoutsShared}
                  >
                    <XStack
                      justifyContent={message.type === 'user' ? 'flex-end' : 'flex-start'}
                      // ROOT CAUSE FIX: Use stable layout handler reference to prevent re-renders
                      onLayout={getLayoutHandler(message.id)}
                    >
                      <MessageBubble
                        type={message.type}
                        content={message.content}
                        timestamp={message.timestamp}
                      />
                    </XStack>
                  </AnimatedMessageWrapper>
                ))}

                {isTyping && (
                  <XStack justifyContent="flex-start">
                    <TypingIndicator />
                  </XStack>
                )}
              </YStack>
            </Animated.ScrollView>
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
