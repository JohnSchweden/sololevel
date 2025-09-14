import { Check, Edit3, X } from '@tamagui/lucide-icons'
import React from 'react'
import { Button, Input, Text, XStack, YStack } from 'tamagui'

export interface VideoTitleProps {
  title: string | null
  isGenerating?: boolean
  isEditable?: boolean
  onTitleEdit?: (newTitle: string) => void
  timestamp?: string
}

export function VideoTitle({
  title,
  isGenerating = false,
  isEditable = true,
  onTitleEdit,
  timestamp,
}: VideoTitleProps) {
  const [isEditing, setIsEditing] = React.useState(false)
  const [editValue, setEditValue] = React.useState(title || '')

  React.useEffect(() => {
    if (title) {
      setEditValue(title)
    }
  }, [title])

  const handleStartEdit = () => {
    if (isEditable && !isGenerating) {
      setIsEditing(true)
      setEditValue(title || '')
    }
  }

  const handleSaveEdit = () => {
    if (editValue.trim() && onTitleEdit) {
      onTitleEdit(editValue.trim())
    }
    setIsEditing(false)
  }

  const handleCancelEdit = () => {
    setEditValue(title || '')
    setIsEditing(false)
  }

  const displayTitle = title || (isGenerating ? 'Generating title...' : 'Video Analysis')

  return (
    <YStack
      alignItems="center"
      paddingHorizontal="$4"
      paddingVertical="$2"
      testID="video-title-container"
    >
      {isEditing ? (
        <XStack
          alignItems="center"
          gap="$2"
          width="100%"
          maxWidth={400}
          testID="title-edit-mode"
        >
          <Input
            flex={1}
            value={editValue}
            onChangeText={setEditValue}
            placeholder="Enter video title..."
            fontSize="$5"
            fontWeight="600"
            color="$color12"
            backgroundColor="$background"
            borderWidth={1}
            borderColor="$borderColor"
            borderRadius="$2"
            padding="$2"
            testID="title-input"
            autoFocus
          />
          <Button
            size={36}
            chromeless
            icon={Check}
            onPress={handleSaveEdit}
            disabled={!editValue.trim()}
            testID="save-title-button"
          />
          <Button
            size={36}
            chromeless
            icon={X}
            onPress={handleCancelEdit}
            testID="cancel-title-button"
          />
        </XStack>
      ) : (
        <YStack
          alignItems="center"
          gap="$1"
          testID="title-display-mode"
        >
          <XStack
            alignItems="center"
            gap="$2"
          >
            <Text
              fontSize="$5"
              fontWeight="600"
              color="$color12"
              textAlign="center"
              testID="video-title-text"
            >
              {displayTitle}
            </Text>
            {isEditable && !isGenerating && (
              <Button
                size={32}
                chromeless
                icon={Edit3}
                onPress={handleStartEdit}
                testID="edit-title-button"
              />
            )}
          </XStack>
          {timestamp && (
            <Text
              fontSize="$3"
              color="$color11"
              testID="video-timestamp"
            >
              {timestamp}
            </Text>
          )}
        </YStack>
      )}
    </YStack>
  )
}
