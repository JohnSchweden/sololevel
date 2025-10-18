import { useSafeArea } from '@app/provider/safe-area/use-safe-area'
import { log } from '@my/logging'
import { ChatInput, GlassBackground, MessageBubble, SuggestionChip, TypingIndicator } from '@my/ui'
import { ChevronDown, ChevronUp, Sparkles, Target, Zap } from '@tamagui/lucide-icons'
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
  testID?: string
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
 * Mobile-first design with glass background.
 *
 * **Navigation Pattern (Expo Router Native):**
 * - Screen is framework-agnostic with no navigation imports
 * - Route file configures header via Tabs.Screen options
 * - All navigation logic isolated in route files
 *
 * @example
 * ```tsx
 * // Route file (apps/expo/app/(tabs)/coach.tsx)
 * <Tabs.Screen
 *   name="coach"
 *   options={{
 *     appHeaderProps: { onMenuPress: () => router.push('/history-progress') }
 *   }}
 * />
 * <CoachScreen />
 * ```
 */
export function CoachScreen({
  testID = 'coach-screen',
}: CoachScreenProps = {}): React.ReactElement {
  // Hooks
  const insets = useSafeArea()
  const APP_HEADER_HEIGHT = 44 // Fixed height from AppHeader component

  // State
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'coach',
      content:
        "Hi there! I'm your Solo:Lvl coach. I'm here to help you improve your fitness technique, answer questions about your workouts, and provide personalized guidance. What would you like to work on today?",
      timestamp: new Date(),
    },
  ])
  const [inputMessage, setInputMessage] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(true)
  const [scrollOffset, setScrollOffset] = useState(0)
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
          paddingTop={insets.top + APP_HEADER_HEIGHT}
          testID={`${testID}-content`}
        >
          {/* Avatar */}
          <YStack
            alignItems="center"
            marginTop="$2"
            marginBottom="$5"
          >
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
            >
              <Image
                source={require('../../../../apps/expo/assets/coach_avatar.png')}
                width={66}
                height={66}
                borderRadius={32}
              />
            </YStack>
          </YStack>

          {/* Messages */}
          <ScrollView
            ref={scrollViewRef}
            flex={1}
            paddingHorizontal="$6"
            //marginBottom="$2"
            testID={`${testID}-messages`}
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }}
            onScroll={handleScroll}
            scrollEventThrottle={16}
          >
            <YStack
              gap="$4"
              paddingBottom="$6"
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

          {/* Input Area */}
          <YStack
            marginHorizontal="$0.5"
            paddingHorizontal="$4"
            //paddingTop="$1"
            gap="$2"
            backgroundColor="$color3"
            borderRadius="$9"
            testID={`${testID}-input-area`}
          >
            {/* Suggestions */}
            <YStack gap="$2">
              {/* Suggestions Header */}
              <XStack
                justifyContent="space-between"
                alignItems="center"
                paddingLeft="$4"
                paddingRight="$1"
                marginBottom="$-2"
              >
                <Text
                  fontSize="$3"
                  color="$color11"
                >
                  Suggestions
                </Text>
                <Button
                  onPress={toggleSuggestions}
                  chromeless
                  circular
                  margin="$-0.5"
                  size="$5"
                  color="$color11"
                  icon={showSuggestions ? ChevronUp : ChevronDown}
                  accessibilityLabel={showSuggestions ? 'Hide suggestions' : 'Show suggestions'}
                  testID={`${testID}-toggle-suggestions`}
                />
              </XStack>

              {/* Suggestions List */}
              {showSuggestions && (
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
              )}
            </YStack>

            {/* Chat Input */}
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
