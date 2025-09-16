// Import Text from react-native for proper text rendering
import { Text, View } from 'react-native'

// Mock @tamagui/toast for testing compatibility
const mockToast = ({ children, ...props }: any) => (
  <View
    testID="toast"
    {...props}
  >
    {children}
  </View>
)

const mockToastTitle = ({ children, ...props }: any) => (
  <Text
    testID="toast-title"
    {...props}
  >
    {children}
  </Text>
)

const mockToastDescription = ({ children, ...props }: any) => (
  <Text
    testID="toast-description"
    {...props}
  >
    {children}
  </Text>
)

// Mock useToastState with configurable behavior - disabled by default
let mockToastState = {
  id: 'mock-toast-id',
  title: '',
  message: '',
  duration: 3000,
  viewportName: undefined as string | undefined,
  isHandledNatively: true, // Disabled by default to prevent showing mock content
}

const mockUseToastState = () => mockToastState

// Export function to configure mock state for tests
export const __setMockToastState = (state: typeof mockToastState) => {
  mockToastState = state
}

// Use mock implementations in test environment
const Toast = Object.assign(mockToast, {
  Title: mockToastTitle,
  Description: mockToastDescription,
})
const useToastState = mockUseToastState

// Import YStack from tamagui
import { YStack } from 'tamagui'

export const NativeToast = () => {
  const currentToast = useToastState()

  if (!currentToast || currentToast.isHandledNatively) {
    return null
  }

  return (
    <Toast
      key={currentToast.id}
      duration={currentToast.duration}
      viewportName={currentToast.viewportName}
      enterStyle={{ opacity: 0, scale: 0.5, y: -25 }}
      exitStyle={{ opacity: 0, scale: 1, y: -20 }}
      y={0}
      opacity={1}
      scale={1}
    >
      <YStack
        paddingVertical="$1.5"
        paddingHorizontal="$2"
      >
        <Toast.Title lineHeight="$1">{currentToast.title}</Toast.Title>
        {currentToast.message && <Toast.Description>{currentToast.message}</Toast.Description>}
      </YStack>
    </Toast>
  )
}
