import { useStableSafeArea } from '@app/provider/safe-area/use-safe-area'
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
import { Image } from 'expo-image'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  FlatList,
  type FlatListProps,
  Keyboard,
  KeyboardAvoidingView,
  type ListRenderItem,
  Platform,
  Pressable,
} from 'react-native'
import Animated, {
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import { Button, Text, View, XStack, YStack } from 'tamagui'

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

// Context-aware response generator with humorous roast tone
const generateCoachResponse = (userMessage: string): string => {
  const lowerMessage = userMessage.toLowerCase()

  // Deadlift form analysis
  if (lowerMessage.includes('deadlift') || lowerMessage.includes('dead lift')) {
    return "Oh boy, your deadlift form? Let's just say I've seen better lifting technique from someone trying to move a couch up three flights of stairs. Your back is probably crying right now. Here's the brutal truth about what you're doing wrong..."
  }

  // Squat technique
  if (lowerMessage.includes('squat')) {
    return "Your squat technique is giving me anxiety. It's like watching a baby bird try to fly for the first time—adorable but painful. Your knees are probably having a board meeting about unionizing. Let me fix this disaster:"
  }

  // Program creation
  if (
    lowerMessage.includes('program') ||
    lowerMessage.includes('30-day') ||
    lowerMessage.includes('plan')
  ) {
    return "A 30-day program? Bold move, considering you probably can't stick to a 3-day program. But I respect the ambition! Let's create something that won't make you quit by day 4. Here's what we're building:"
  }

  // Form analysis (general)
  if (
    lowerMessage.includes('form') ||
    lowerMessage.includes('analyze') ||
    lowerMessage.includes('technique')
  ) {
    return "Alright, let's be real here. Your form is about as stable as a Jenga tower in an earthquake. But hey, at least you're trying! Here's what's actually happening..."
  }

  // Bench press
  if (lowerMessage.includes('bench') || lowerMessage.includes('press')) {
    return "Your bench press? More like bench mess. I've seen better pressing technique from someone trying to push a door that says 'pull'. Your shoulders are probably plotting revenge. Let's fix this:"
  }

  // Cardio/endurance
  if (
    lowerMessage.includes('cardio') ||
    lowerMessage.includes('endurance') ||
    lowerMessage.includes('running')
  ) {
    return "Cardio? You mean that thing you do for 5 minutes before giving up? I've seen better endurance from a sloth on a treadmill. But we're gonna change that. Here's how:"
  }

  // Nutrition/diet
  if (
    lowerMessage.includes('nutrition') ||
    lowerMessage.includes('diet') ||
    lowerMessage.includes('eat')
  ) {
    return "Your nutrition plan? Let me guess—it's 'eat whatever, whenever'? I've seen better meal planning from a college student living on ramen. But we're gonna fix this disaster together:"
  }

  // Generic fallback responses
  const genericResponses = [
    "I've seen better technique from a newborn giraffe learning to walk. But I respect the hustle. Let me show you how to not embarrass yourself:",
    "Oh honey, your body mechanics are giving me secondhand embarrassment. But we're gonna fix this mess together. Here's the brutal truth:",
    "Your dedication is admirable, but your execution? Yikes. It's like watching someone try to parallel park for the first time. Let's fix this disaster:",
    "I appreciate the enthusiasm, but your proprioception is about as accurate as a broken GPS. Here's what you're actually doing wrong:",
    "Listen, I've seen toddlers with better coordination, but at least you're not giving up. Let me roast your technique and then show you the way:",
    "Your form is so off, it's making my circuits hurt. But I'm here to help, not just judge. Here's what needs to happen:",
  ]

  return genericResponses[Math.floor(Math.random() * genericResponses.length)]
}

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
  // Use stable safe area hook to prevent layout jumps during navigation
  const insets = useStableSafeArea()

  // Reduce bottom inset to minimize spacing (subtract 12px, minimum 0)
  // Matches BottomNavigationContainer.native.tsx reduction
  const bottomInset = useMemo(() => Math.max(0, insets.bottom - 22), [insets.bottom])

  const APP_HEADER_HEIGHT = 44 // Fixed height from AppHeader component
  const BOTTOM_TAB_BAR_HEIGHT = (Platform.OS === 'android' ? 52 : 52) + bottomInset // Fixed height from BottomNavigationContainer

  // PERF FIX: Memoize container style to prevent recalculating layout on every render
  // Replaced SafeAreaView with View to eliminate synchronous native bridge calls
  const containerStyle = useMemo(() => ({ flex: 1 as const }), [])
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
          "Hey there! I'm your Solo:Level coach, and I'm here to roast your form into shape. Think of me as that brutally honest friend who actually wants you to succeed. I'll call out your mistakes, make you laugh (or cry), and help you level up. What disaster are we fixing today?",
        timestamp: new Date(),
      },
    ]
  )
  const [inputMessage, setInputMessage] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(!sessionId)
  const [isSuggestionsButtonPressed, setIsSuggestionsButtonPressed] = useState(false)
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false)
  // Reanimated shared value for suggestions slide animation (1 = visible, 0 = hidden)
  // Initialize based on sessionId: expanded for new sessions, collapsed for existing sessions
  const suggestionsProgress = useSharedValue(!sessionId ? 1 : 0)
  const flatListRef = useRef<FlatList<Message>>(null)

  const handleChatInputFocus = useCallback((): void => {
    // Scroll to bottom when input is focused to ensure it's visible above keyboard
    if (flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true })
      }, 100)
    }
  }, [])

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

      // Simulate AI response with context-aware message
      setTimeout(
        () => {
          const coachResponse: Message = {
            id: (Date.now() + 1).toString(),
            type: 'coach',
            content: generateCoachResponse(messageToSend),
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
      // Close suggestions list after selection
      setShowSuggestions(false)
      setTimeout(() => {
        suggestionsProgress.value = withTiming(0, {
          duration: 300,
        })
      }, 0)
    },
    [sendMessage, suggestionsProgress]
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

  // Keyboard visibility tracking
  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setIsKeyboardVisible(true)
    )
    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setIsKeyboardVisible(false)
    )

    return () => {
      keyboardWillShow.remove()
      keyboardWillHide.remove()
    }
  }, [])

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
      <View style={containerStyle}>
        <KeyboardAvoidingView
          style={containerStyle}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <YStack
            flex={1}
            paddingBottom={0}
            testID={`${testID}-content`}
          >
            {/* Sticky Header Overlay */}
            <Pressable
              onPress={Keyboard.dismiss}
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                zIndex: 10,
              }}
              testID={`${testID}-sticky-header`}
            >
              {Platform.OS === 'ios' ? (
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
                        contentFit="cover"
                        style={{
                          width: 66,
                          height: 66,
                          borderRadius: 32,
                        }}
                        cachePolicy="memory-disk"
                        transition={200}
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
              ) : (
                <YStack
                  backgroundColor="$color3"
                  opacity={0.85}
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
                        contentFit="cover"
                        style={{
                          width: 66,
                          height: 66,
                          borderRadius: 32,
                        }}
                        cachePolicy="memory-disk"
                        transition={200}
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
                </YStack>
              )}
            </Pressable>

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
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="interactive"
              />
            </YStack>

            {/* Input Area */}
            <YStack
              //marginHorizontal="$0.5"
              paddingHorizontal="$4"
              gap="$0"
              paddingBottom={
                isKeyboardVisible
                  ? 0
                  : hasBottomNavigation
                    ? BOTTOM_TAB_BAR_HEIGHT
                    : sessionId
                      ? bottomInset + 8
                      : 0
              }
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
                    marginBottom="$1"
                  >
                    <XStack
                      gap="$0"
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
                  onFocus={handleChatInputFocus}
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
        </KeyboardAvoidingView>
      </View>
    </GlassBackground>
  )
}

// Enable why-did-you-render tracking for performance debugging
if (__DEV__) {
  CoachScreen.whyDidYouRender = true
}
