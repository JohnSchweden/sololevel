import { useUser } from '@my/api'
import { Avatar, Button, H2, Paragraph, XStack, YStack } from '@my/ui'
import { ChevronLeft, RefreshCw } from '@tamagui/lucide-icons'
import { ErrorBanner } from '../../components/ErrorBanner'
import { ErrorBoundary } from '../../components/ErrorBoundary'
import { LoadingSpinner } from '../../components/LoadingSpinner'

interface UserDetailScreenProps {
  id: string
  onGoBack?: () => void
}

/**
 * Example user detail screen with comprehensive error handling
 * Demonstrates all the patterns from error-handling.mdc
 */
export function UserDetailScreenWithErrorHandling({ id, onGoBack }: UserDetailScreenProps) {
  return (
    <ErrorBoundary>
      <UserDetailContent
        id={id}
        onGoBack={onGoBack}
      />
    </ErrorBoundary>
  )
}

function UserDetailContent({ id, onGoBack }: UserDetailScreenProps) {
  // ✅ Good: Use TanStack Query with proper error handling
  const { data: user, error, isLoading, isError, refetch } = useUser(id)

  return (
    <YStack
      flex={1}
      bg="$background"
    >
      {/* Header */}
      <XStack
        items="center"
        gap="$3"
        p="$4"
        borderBottomWidth={1}
        borderBottomColor="$borderColor"
      >
        {onGoBack && (
          <Button
            size="$3"
            variant="outlined"
            icon={ChevronLeft}
            onPress={onGoBack}
            circular
          />
        )}
        <H2 flex={1}>User Profile</H2>
        <Button
          size="$3"
          variant="outlined"
          icon={RefreshCw}
          onPress={() => refetch()}
          circular
          disabled={isLoading}
        />
      </XStack>

      {/* Content */}
      <YStack
        flex={1}
        p="$4"
        gap="$4"
      >
        {/* ✅ Good: Show error banner with retry option */}
        {isError && error && (
          <ErrorBanner
            error={error}
            onRetry={refetch}
            variant="inline"
          />
        )}

        {/* ✅ Good: Show loading state */}
        {isLoading && <LoadingSpinner message="Loading user profile..." />}

        {/* ✅ Good: Graceful handling of missing data */}
        {!isLoading && !isError && !user && (
          <YStack
            items="center"
            gap="$4"
            py="$8"
          >
            <Paragraph
              color="$color10"
              text="center"
            >
              User not found
            </Paragraph>
            <Button
              onPress={onGoBack}
              variant="outlined"
            >
              Go Back
            </Button>
          </YStack>
        )}

        {/* User content */}
        {user && !isLoading && <UserProfileContent user={user} />}
      </YStack>
    </YStack>
  )
}

function UserProfileContent({ user }: { user: any }) {
  return (
    <YStack gap="$6">
      {/* Avatar and basic info */}
      <YStack
        items="center"
        gap="$3"
      >
        <Avatar
          size="$10"
          circular
        >
          <Avatar.Image
            src={user.avatar_url}
            onError={(error) => {
              // Avatar fallback will be shown automatically
            }}
          />
          <Avatar.Fallback>{user.name?.charAt(0)?.toUpperCase() || '?'}</Avatar.Fallback>
        </Avatar>

        <YStack
          items="center"
          gap="$1"
        >
          <H2>{user.name || 'Unknown User'}</H2>
          <Paragraph color="$color10">{user.email}</Paragraph>
        </YStack>
      </YStack>

      {/* User details */}
      <YStack gap="$3">
        <DetailRow
          label="User ID"
          value={user.id}
        />
        <DetailRow
          label="Member since"
          value={user.created_at ? new Date(user.created_at).toLocaleDateString() : 'Unknown'}
        />
        <DetailRow
          label="Last updated"
          value={user.updated_at ? new Date(user.updated_at).toLocaleDateString() : 'Unknown'}
        />
      </YStack>
    </YStack>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <XStack
      justify="space-between"
      items="center"
      py="$2"
    >
      <Paragraph
        color="$color10"
        fontWeight="500"
      >
        {label}
      </Paragraph>
      <Paragraph color="$color12">{value}</Paragraph>
    </XStack>
  )
}
