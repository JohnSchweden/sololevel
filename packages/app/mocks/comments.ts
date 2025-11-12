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

export const mockComments: CommentItem[] = [
  {
    id: 'seed-comment-1',
    authorName: 'Peter Parker',
    avatarUrl: getAvatarUrl('Peter Parker'),
    text: 'Your hand gestures are doing more work than your words. But the energy? Infectious. Keep it up.',
    timeAgo: '1d',
    likes: 1100,
    repliesCount: 7,
    parentId: null,
    createdAt: Date.now() - 24 * 60 * 60 * 1000, // 1 day ago
  },
  {
    id: 'seed-comment-2',
    authorName: 'Thor',
    avatarUrl: getAvatarUrl('Thor'),
    text: '47 "ums" in 3 minutes. But when you got going? Legendary. 🔥',
    timeAgo: '2h',
    likes: 234,
    repliesCount: 3,
    parentId: null,
    createdAt: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago
  },
  {
    id: 'seed-comment-3',
    authorName: 'Tony Stark',
    avatarUrl: getAvatarUrl('Tony Stark'),
    text: 'Your pacing improved from start to finish. You found your rhythm and it shows.',
    timeAgo: '5h',
    likes: 567,
    repliesCount: 12,
    parentId: null,
    createdAt: Date.now() - 5 * 60 * 60 * 1000, // 5 hours ago
  },
  {
    id: 'seed-comment-4',
    authorName: 'Natasha Romanoff',
    avatarUrl: getAvatarUrl('Natasha Romanoff'),
    text: "That recovery at 2:30 was smooth. Most people panic. You kept going. That's pro level.",
    timeAgo: '8h',
    likes: 89,
    repliesCount: 4,
    parentId: null,
    createdAt: Date.now() - 8 * 60 * 60 * 1000, // 8 hours ago
  },
  {
    id: 'seed-comment-5',
    authorName: 'Steve Rogers',
    avatarUrl: getAvatarUrl('Steve Rogers'),
    text: 'Eye contact game is strong. Those pauses for emphasis? Perfect.',
    timeAgo: '12h',
    likes: 445,
    repliesCount: 2,
    parentId: null,
    createdAt: Date.now() - 12 * 60 * 60 * 1000, // 12 hours ago
  },
  {
    id: 'seed-comment-6',
    authorName: 'Bruce Banner',
    avatarUrl: getAvatarUrl('Bruce Banner'),
    text: "You're reading your notes too much. But when you look up and connect? That's when it clicks. Trust yourself.",
    timeAgo: '1d',
    likes: 312,
    repliesCount: 0,
    parentId: null,
    createdAt: Date.now() - 25 * 60 * 60 * 1000, // 1 day ago
  },
  {
    id: 'seed-comment-7',
    authorName: 'Wanda Maximoff',
    avatarUrl: getAvatarUrl('Wanda Maximoff'),
    text: "Love how authentic you are. You're not trying to be someone else. That vulnerability makes everything you say hit harder.",
    timeAgo: '2d',
    likes: 678,
    repliesCount: 8,
    parentId: null,
    createdAt: Date.now() - 2 * 24 * 60 * 60 * 1000, // 2 days ago
  },
  {
    id: 'seed-comment-8',
    authorName: 'Vision',
    avatarUrl: getAvatarUrl('Vision'),
    text: "Voice projection needs work. I had to turn up my volume. But your content structure? Impeccable. Match delivery to substance and you're unstoppable.",
    timeAgo: '3d',
    likes: 123,
    repliesCount: 1,
    parentId: null,
    createdAt: Date.now() - 3 * 24 * 60 * 60 * 1000, // 3 days ago
  },
]
