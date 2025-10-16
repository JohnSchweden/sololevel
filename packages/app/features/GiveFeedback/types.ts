export type FeedbackType = 'bug' | 'suggestion' | 'complaint' | 'other'

export interface FeedbackTypeOption {
  id: FeedbackType
  label: string
  icon: string
  color: 'red' | 'blue' | 'orange' | 'purple'
}

export interface FeedbackSubmission {
  type: FeedbackType
  message: string
}

export const FEEDBACK_TYPES: ReadonlyArray<FeedbackTypeOption> = [
  { id: 'bug', label: 'Bug Report', icon: '🐛', color: 'red' },
  { id: 'suggestion', label: 'Suggestion', icon: '💡', color: 'blue' },
  { id: 'complaint', label: 'Complaint', icon: '😔', color: 'orange' },
  { id: 'other', label: 'Other', icon: '💬', color: 'purple' },
] as const
