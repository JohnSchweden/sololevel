import { type CoachMode, VOICE_TEXT_CONFIG } from '@my/config'

/**
 * Mock comment items for VideoAnalysis feature
 * Used as fallback when no real comment data is available
 * Non-numeric IDs (seed-*) signal to skip backend fetching
 *
 * @see packages/app/features/VideoAnalysis/hooks/useFeedbackAudioSource.ts (lines 69-78)
 */

export interface CommentItem {
  id: string
  authorName: string
  avatarUrl?: string // Avatar image URL
  text: string
  timeAgo: string // e.g., "1d", "10 days ago", "2h"
  likes: number
  repliesCount?: number
  parentId?: string | null // For nested replies
  createdAt: number // Timestamp for sorting
}

/**
 * Mock comments matching wireframe design
 * Clean YouTube/TikTok-style comments with sorting support
 */
/**
 * Real actor/character photos from publicly available sources
 * Using direct image URLs from reliable public domain/CC licensed sources
 */
const getAvatarUrl = (name: string): string => {
  // Map of names to publicly available image URLs
  // Using Unsplash Source API for high-quality, free-to-use images
  // These are real person photos suitable for avatars
  const avatarMap: Record<string, string> = {
    'Peter Parker':
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
    Thor: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face',
    'Tony Stark':
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
    'Natasha Romanoff':
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face',
    'Steve Rogers':
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop&crop=face',
    'Bruce Banner':
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face&seed=bruce',
    'Wanda Maximoff':
      'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face',
    Vision:
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop&crop=face&seed=vision',
  }

  return (
    avatarMap[name] ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=100&background=random`
  )
}

/**
 * Generate mock comments based on voice mode
 * Converts voice text demoComments to CommentItem format
 */
export function getMockComments(voiceMode: CoachMode = 'roast'): CommentItem[] {
  const demoComments = VOICE_TEXT_CONFIG[voiceMode].comments.demoComments

  // Helper to parse timeAgo string to milliseconds offset
  const parseTimeAgo = (timeAgo: string): number => {
    if (timeAgo.includes('d')) {
      const days = Number.parseInt(timeAgo.replace('d', '').trim(), 10) || 1
      return Date.now() - days * 24 * 60 * 60 * 1000
    }
    if (timeAgo.includes('h')) {
      const hours = Number.parseInt(timeAgo.replace('h', '').trim(), 10) || 1
      return Date.now() - hours * 60 * 60 * 1000
    }
    if (timeAgo.includes('m')) {
      const minutes = Number.parseInt(timeAgo.replace('m', '').trim(), 10) || 1
      return Date.now() - minutes * 60 * 1000
    }
    return Date.now() - 24 * 60 * 60 * 1000 // Default to 1 day ago
  }

  // Generate additional comments to reach 8 total (matching original structure)
  // Cycle through demoComments and add some variations
  const allComments: Array<{ authorName: string; text: string; timeAgo: string }> = [
    ...demoComments,
    ...demoComments.slice(0, Math.max(0, 8 - demoComments.length)).map((comment, index) => ({
      ...comment,
      timeAgo: `${index + 4}h`, // Vary timestamps
    })),
  ].slice(0, 8)

  // Sample likes/replies for variety (mode-independent)
  const likesDistribution = [1100, 234, 567, 89, 445, 312, 678, 123]
  const repliesDistribution = [7, 3, 12, 4, 2, 0, 8, 1]

  return allComments.map((comment, index) => ({
    id: `seed-comment-${index + 1}`,
    authorName: comment.authorName,
    avatarUrl: getAvatarUrl(comment.authorName),
    text: comment.text,
    timeAgo: comment.timeAgo,
    likes: likesDistribution[index % likesDistribution.length],
    repliesCount: repliesDistribution[index % repliesDistribution.length],
    parentId: null,
    createdAt: parseTimeAgo(comment.timeAgo),
  }))
}

// Export default constant for backward compatibility (uses 'roast' mode)
export const mockComments: CommentItem[] = getMockComments('roast')
