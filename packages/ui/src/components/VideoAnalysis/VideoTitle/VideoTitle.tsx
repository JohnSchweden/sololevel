import { Check, Edit3, X } from '@tamagui/lucide-icons'
import React from 'react'
import { Platform, StatusBar } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Button, Input, Text, XStack, YStack } from 'tamagui'

export interface VideoTitleProps {
  title: string | null
  isGenerating?: boolean
  isEditable?: boolean
  onTitleEdit?: (newTitle: string) => void
  timestamp?: string
  // Overlay mode: non-editable, prominent display for video overlay
  overlayMode?: boolean
  // Controls visibility: only show title when controls are visible (for overlay mode)
  controlsVisible?: boolean
}

export function VideoTitle({
  title,
  isGenerating = false,
  isEditable = true,
  onTitleEdit,
  timestamp,
  overlayMode = false,
  controlsVisible = true,
}: VideoTitleProps) {
  const [isEditing, setIsEditing] = React.useState(false)
  const [editValue, setEditValue] = React.useState(title || '')
  const insets = useSafeAreaInsets()

  React.useEffect(() => {
    if (title) {
      setEditValue(title)
    }
  }, [title])

  // Calculate header height: status bar + AppHeader height (44px) + spacing
  // Match NavigationAppHeader logic: topInset (status bar) + AppHeader (44px)
  // Use StatusBar.currentHeight as fallback when insets.top is 0 (older phones, initialization)
  const APP_HEADER_HEIGHT = 44
  const MIN_SPACING = 0 // Minimum spacing below header to prevent overlap

  // Get status bar height: use insets.top (includes status bar on iOS), fallback to StatusBar API
  // On older phones, insets.top might be 0 but status bar still exists (20px on iPhone SE/8)
  const statusBarHeight = React.useMemo(() => {
    if (insets.top > 0) {
      return insets.top
    }
    // Fallback: use StatusBar.currentHeight (Android) or default iOS status bar height
    if (Platform.OS === 'android' && StatusBar.currentHeight) {
      return StatusBar.currentHeight
    }
    // Default iOS status bar height for older phones (iPhone SE, iPhone 8, etc.)
    return Platform.OS === 'ios' ? 20 : 0
  }, [insets.top])

  const headerOffset = statusBarHeight + APP_HEADER_HEIGHT + MIN_SPACING

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

  // Overlay mode: simplified, non-editable display
  if (overlayMode) {
    if (!title) return null // Don't render if no title
    if (!controlsVisible) return null // Don't render when controls are hidden

    return (
      <YStack
        alignItems="flex-start"
        paddingTop={headerOffset}
        paddingHorizontal="$4"
        paddingBottom="$2"
        testID="video-title-overlay"
        pointerEvents="none" // Don't block video interactions
      >
        <Text
          fontSize="$5"
          fontWeight="600"
          color="$color"
          textAlign="left"
          testID="video-title-overlay-text"
        >
          {displayTitle}
        </Text>
      </YStack>
    )
  }

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
            borderWidth={0}
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
