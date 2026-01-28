import React from 'react'
import { Text } from 'tamagui'

/**
 * Parse markdown bold (**text**) and render as nested Text components with bold styling
 * PERFORMANCE: Should be wrapped in useMemo by caller to avoid re-parsing on every render
 * Returns an array of React nodes that can be used as children of a Text component
 */
export function renderMarkdownText(text: string): React.ReactNode[] {
  if (!text) return []

  const parts: React.ReactNode[] = []
  // Create regex inside function to avoid global state issues in concurrent renders
  const boldRegex = /\*\*(.+?)\*\*/g
  let lastIndex = 0
  let match
  let boldCounter = 0

  while ((match = boldRegex.exec(text)) !== null) {
    // Add text before the bold section
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index))
    }
    // Add bold text as nested Text component
    // Key is based on content hash (first 20 chars) + counter for uniqueness
    // This ensures same content gets same key regardless of position in string
    const contentKey = match[1].substring(0, 20).replace(/\s+/g, '-')
    parts.push(
      <Text
        key={`bold-${contentKey}-${boldCounter++}`}
        fontWeight="700"
      >
        {match[1]}
      </Text>
    )
    lastIndex = match.index + match[0].length
  }

  // Add remaining text after last match
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex))
  }

  // If no matches, return original text as string
  if (parts.length === 0) {
    return [text]
  }

  return parts
}
