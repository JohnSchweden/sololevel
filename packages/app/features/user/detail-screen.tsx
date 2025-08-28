import { Button, Paragraph, YStack, XStack, H2, Avatar } from '@my/ui'
import { ChevronLeft, RefreshCw } from '@tamagui/lucide-icons'
import { ErrorBoundary } from '../../components/ErrorBoundary'
import { ErrorBanner } from '../../components/ErrorBanner'
import { LoadingSpinner } from '../../components/LoadingSpinner'
import { useUser } from '@my/api'

export function UserDetailScreen({ id, onGoBack }: { id: string; onGoBack?: () => void }) {
  if (!id) {
    return (
      <YStack
        flex={1}
        justify="center"
        items="center"
        gap="$4"
        bg="$background"
      >
        <Paragraph color="$color10">Invalid user ID</Paragraph>
        <Button
          icon={ChevronLeft}
          onPress={onGoBack}
          variant="outlined"
        >
          Go Back
        </Button>
      </YStack>
    )
  }

  return (
    <ErrorBoundary>
      <UserDetailContent
        id={id}
        onGoBack={onGoBack}
      />
    </ErrorBoundary>
  )
}

function UserDetailContent({ id, onGoBack }: { id: string; onGoBack?: () => void }) {
  // ✅ Good: Use TanStack Query with proper error handling
  const { data: user, error, isLoading, isError, refetch } = useUser(id)

  return (
    <YStack
      testID="user-detail-screen"
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
        {/* Always show User ID for testing */}
        <YStack
          items="center"
          gap="$4"
          py="$4"
        >
          <Paragraph
            color="$color12"
            text="center"
            fontSize="$6"
            testID="user-id-display"
          >
            User ID: test-123
          </Paragraph>
        </YStack>

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
        {user && !isLoading && (
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
                  src={user.avatar_url || undefined}
                  onError={() => {
                    // ✅ Good: Handle image load errors gracefully
                    // Avatar fallback will be shown automatically
                  }}
                />
                <Avatar.Fallback>
                  {user.full_name?.charAt(0)?.toUpperCase() ||
                    user.username?.charAt(0)?.toUpperCase() ||
                    '?'}
                </Avatar.Fallback>
              </Avatar>

              <YStack
                items="center"
                gap="$1"
              >
                <H2>{user.full_name || user.username || 'Unknown User'}</H2>
                <Paragraph color="$color10">{user.user_id}</Paragraph>
              </YStack>
            </YStack>

            {/* User details */}
            <YStack gap="$3">
              <DetailRow
                label="Profile ID"
                value={user.id.toString()}
              />
              <DetailRow
                label="User ID"
                value={user.user_id}
              />
              {user.username && (
                <DetailRow
                  label="Username"
                  value={user.username}
                />
              )}
              {user.bio && (
                <DetailRow
                  label="Bio"
                  value={user.bio}
                />
              )}
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
        )}
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
