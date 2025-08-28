import { supabase } from '@my/api'
import { Button, Separator, Text, XStack, YStack } from '@my/ui'
import { useState } from 'react'
import { useAuthStore } from '../../stores/auth'
import { useFeatureFlagsStore } from '../../stores/feature-flags'
import { useThemeStore } from '../../stores/theme'

export function DemoScreen() {
  const { user, session, loading: authLoading, initialized } = useAuthStore()
  const { mode, isDark, toggleMode } = useThemeStore()
  const { flags: featureFlags, toggleFlag } = useFeatureFlagsStore()

  const [testResult, setTestResult] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const testSupabaseConnection = async () => {
    setLoading(true)
    try {
      // Test multiple connection methods

      // 1. Test basic client connection
      const client = supabase
      if (!client) {
        setTestResult('❌ Supabase client not initialized')
        return
      }

      // 2. Test database connection with a simple query
      // Use count() function which should work without authentication
      const { error, count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })

      if (error) {
        // Even if we get an auth error, it means the connection works
        if (error.message.includes('JWT') || error.message.includes('auth')) {
          setTestResult('✅ Supabase connected (authentication required for data access)')
        } else {
          setTestResult(`❌ Database Error: ${error.message}`)
        }
      } else {
        setTestResult(`✅ Supabase connection successful! (Found ${count || 0} profiles)`)
      }
    } catch (error) {
      setTestResult(`❌ Connection failed: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <YStack
      padding="$4"
      space="$4"
      flex={1}
    >
      <Text
        fontSize="$8"
        fontWeight="bold"
      >
        Tamagui + Solito
      </Text>

      <Separator />

      {/* Auth State */}
      <YStack space="$2">
        <Text
          fontSize="$6"
          fontWeight="600"
        >
          🔐 Auth State
        </Text>
        <Text>Loading: {authLoading ? 'Yes' : 'No'}</Text>
        <Text>Initialized: {initialized ? 'Yes' : 'No'}</Text>
        <Text>User: {user ? `${user.email}` : 'Not logged in'}</Text>
        <Text>Session: {session ? 'Active' : 'None'}</Text>
      </YStack>

      <Separator />

      {/* Theme State */}
      <YStack space="$2">
        <Text
          fontSize="$6"
          fontWeight="600"
        >
          🎨 Theme State
        </Text>
        <Text>Mode: {mode}</Text>
        <Text>Is Dark: {isDark ? 'Yes' : 'No'}</Text>
        <Button
          onPress={toggleMode}
          size="$3"
        >
          Toggle Theme ({isDark ? 'Light' : 'Dark'})
        </Button>
      </YStack>

      <Separator />

      {/* Feature Flags */}
      <YStack space="$2">
        <Text
          fontSize="$6"
          fontWeight="600"
        >
          🚩 Feature Flags
        </Text>
        <XStack
          space="$2"
          flexWrap="wrap"
        >
          <Button
            size="$2"
            variant={featureFlags.enableDevMode ? 'outlined' : undefined}
            onPress={() => toggleFlag('enableDevMode')}
          >
            Dev Mode: {featureFlags.enableDevMode ? 'ON' : 'OFF'}
          </Button>
          <Button
            size="$2"
            variant={featureFlags.showDebugInfo ? 'outlined' : undefined}
            onPress={() => toggleFlag('showDebugInfo')}
          >
            Debug: {featureFlags.showDebugInfo ? 'ON' : 'OFF'}
          </Button>
          <Button
            size="$2"
            variant={featureFlags.enableBetaFeatures ? 'outlined' : undefined}
            onPress={() => toggleFlag('enableBetaFeatures')}
          >
            Beta: {featureFlags.enableBetaFeatures ? 'ON' : 'OFF'}
          </Button>
        </XStack>
        <Text
          fontSize="$2"
          color="$color10"
        >
          Mock Data: {featureFlags.useMockData ? 'Enabled' : 'Disabled'}
        </Text>
      </YStack>

      <Separator />

      {/* Supabase Test */}
      <YStack space="$2">
        <Text
          fontSize="$6"
          fontWeight="600"
        >
          🗄️ Supabase Connection
        </Text>
        <Button
          onPress={testSupabaseConnection}
          disabled={loading}
          size="$3"
        >
          {loading ? 'Testing...' : 'Test Database Connection'}
        </Button>
        {testResult ? (
          <Text
            fontSize="$3"
            color={testResult.includes('✅') ? '$green11' : '$red11'}
          >
            {testResult}
          </Text>
        ) : null}
      </YStack>

      <Separator />

      {/* Debug Info */}
      {featureFlags.showDebugInfo ? (
        <YStack space="$2">
          <Text
            fontSize="$6"
            fontWeight="600"
          >
            🐛 Debug Info
          </Text>
          <Text
            fontSize="$2"
            color="$color11"
          >
            Environment: {process.env.NODE_ENV}
          </Text>
          <Text
            fontSize="$2"
            color="$color11"
          >
            Platform: {typeof window !== 'undefined' ? 'Web' : 'Native'}
          </Text>
          <Text
            fontSize="$2"
            color="$color11"
          >
            Stores: auth, theme, featureFlags ✓
          </Text>
          <Text
            fontSize="$2"
            color="$color11"
          >
            Supabase: {typeof supabase !== 'undefined' ? 'Loaded ✓' : 'Error ❌'}
          </Text>
        </YStack>
      ) : null}
    </YStack>
  )
}
