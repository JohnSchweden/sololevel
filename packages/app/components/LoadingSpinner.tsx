import { YStack, Paragraph } from '@my/ui'

interface LoadingSpinnerProps {
  message?: string
  inline?: boolean
}

export function LoadingSpinner({ message = 'Loading...', inline = false }: LoadingSpinnerProps) {
  if (inline) {
    return (
      <YStack
        gap="$2"
        items="center"
        py="$2"
      >
        <Paragraph
          color="$color10"
          fontSize="$6"
        >
          ⏳
        </Paragraph>
        {message && (
          <Paragraph
            color="$color10"
            fontSize="$3"
          >
            {message}
          </Paragraph>
        )}
      </YStack>
    )
  }

  return (
    <YStack
      flex={1}
      justify="center"
      items="center"
      gap="$4"
      p="$4"
    >
      <Paragraph
        color="$color10"
        fontSize="$8"
      >
        ⏳
      </Paragraph>
      {message && (
        <Paragraph
          color="$color10"
          text="center"
        >
          {message}
        </Paragraph>
      )}
    </YStack>
  )
}
