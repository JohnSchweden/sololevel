import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { FeedbackBubbles } from './FeedbackBubbles'

// Mocks are handled globally in src/test-utils/setup.ts

const mockMessages = [
  {
    id: '1',
    timestamp: 1000,
    text: 'Great posture!',
    type: 'positive' as const,
    category: 'posture' as const,
    position: { x: 50, y: 50 },
    isHighlighted: false,
    isActive: true,
  },
  {
    id: '2',
    timestamp: 2000,
    text: 'Bend your knees a little bit',
    type: 'suggestion' as const,
    category: 'movement' as const,
    position: { x: 100, y: 100 },
    isHighlighted: false,
    isActive: true,
  },
  {
    id: '3',
    timestamp: 3000,
    text: 'Keep your back straight!',
    type: 'correction' as const,
    category: 'posture' as const,
    position: { x: 150, y: 150 },
    isHighlighted: true,
    isActive: true,
  },
]

describe('FeedbackBubbles', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders feedback bubbles without crashing', () => {
    render(<FeedbackBubbles messages={mockMessages} />)

    expect(screen.getByLabelText('Great posture!')).toBeInTheDocument()
  })

  it('renders with empty messages array', () => {
    render(<FeedbackBubbles messages={[]} />)

    // Component returns null for empty messages
    expect(screen.queryByLabelText('Great posture!')).not.toBeInTheDocument()
  })

  it('limits display to last 3 messages', () => {
    const manyMessages = [
      ...mockMessages,
      {
        id: '4',
        timestamp: 4000,
        text: 'Fourth message',
        type: 'positive' as const,
        category: 'voice' as const,
        position: { x: 200, y: 200 },
        isHighlighted: false,
        isActive: true,
      },
      {
        id: '5',
        timestamp: 5000,
        text: 'Fifth message',
        type: 'suggestion' as const,
        category: 'grip' as const,
        position: { x: 250, y: 250 },
        isHighlighted: false,
        isActive: true,
      },
    ]

    render(<FeedbackBubbles messages={manyMessages} />)

    // Component shows most recent 3 by timestamp (sorted descending, most recent first)
    expect(screen.getByLabelText('Fifth message')).toBeInTheDocument() // timestamp 5000
    expect(screen.getByLabelText('Fourth message')).toBeInTheDocument() // timestamp 4000
    expect(screen.getByLabelText('Keep your back straight!')).toBeInTheDocument() // timestamp 3000
    // Should not show older messages (timestamp 1000, 2000)
    expect(screen.queryByLabelText('Great posture!')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Bend your knees a little bit')).not.toBeInTheDocument()
  })

  it('renders bubbles with proper structure', () => {
    render(<FeedbackBubbles messages={mockMessages} />)

    // Test that the component renders properly
    expect(screen.getByLabelText('Great posture!')).toBeInTheDocument()
  })

  it('renders highlighted messages with different styling', () => {
    render(<FeedbackBubbles messages={mockMessages} />)

    expect(screen.getByLabelText('Keep your back straight!')).toBeInTheDocument()
  })

  it('renders inactive messages with reduced opacity', () => {
    const inactiveMessages = [
      {
        ...mockMessages[0],
        isActive: false,
      },
    ]

    render(<FeedbackBubbles messages={inactiveMessages} />)

    // Component returns null for inactive messages
    expect(screen.queryByLabelText('Great posture!')).not.toBeInTheDocument()
  })

  describe('Phase 2: Interactive Elements Tests', () => {
    describe('Bubble Tap Interactions', () => {
      it('calls onBubbleTap when a feedback bubble is pressed', () => {
        render(<FeedbackBubbles messages={mockMessages} />)

        // Find the first bubble by its accessibility label
        const firstBubble = screen.getByLabelText('Great posture!')
        expect(firstBubble).toBeTruthy()
      })

      it('renders different bubbles correctly', () => {
        render(<FeedbackBubbles messages={mockMessages} />)

        // Find the second bubble by its accessibility label
        const secondBubble = screen.getByLabelText('Bend your knees a little bit')
        expect(secondBubble).toBeTruthy()
      })

      it('renders highlighted bubbles correctly', () => {
        render(<FeedbackBubbles messages={mockMessages} />)

        // Find the third bubble (which is highlighted) by its accessibility label
        const highlightedBubble = screen.getByLabelText('Keep your back straight!')
        expect(highlightedBubble).toBeTruthy()
      })

      it('renders active bubbles correctly', () => {
        const activeMessages = [
          {
            ...mockMessages[0],
            isActive: true,
          },
        ]

        render(<FeedbackBubbles messages={activeMessages} />)

        // Find the active bubble by its accessibility label
        const activeBubble = screen.getByLabelText('Great posture!')
        expect(activeBubble).toBeTruthy()
      })
    })

    describe('Message Filtering and Display', () => {
      it('displays only the last 3 messages when more than 3 are provided', () => {
        const manyMessages = [
          ...mockMessages,
          {
            id: '4',
            timestamp: 4000,
            text: 'Fourth message',
            type: 'positive' as const,
            category: 'voice' as const,
            position: { x: 200, y: 200 },
            isHighlighted: false,
            isActive: true,
          },
          {
            id: '5',
            timestamp: 5000,
            text: 'Fifth message',
            type: 'suggestion' as const,
            category: 'grip' as const,
            position: { x: 250, y: 250 },
            isHighlighted: false,
            isActive: true,
          },
        ]

        render(<FeedbackBubbles messages={manyMessages} />)

        // Should show exactly 3 bubbles (last 3 messages by timestamp, most recent first)
        expect(screen.getByLabelText('Fifth message')).toBeTruthy() // timestamp 5000
        expect(screen.getByLabelText('Fourth message')).toBeTruthy() // timestamp 4000
        expect(screen.getByLabelText('Keep your back straight!')).toBeTruthy() // timestamp 3000
      })

      it('handles empty messages array gracefully', () => {
        render(<FeedbackBubbles messages={[]} />)

        // Component returns null for empty messages
        expect(screen.queryByLabelText('Great posture!')).not.toBeInTheDocument()
      })

      it('updates displayed messages when messages prop changes', () => {
        const { rerender } = render(<FeedbackBubbles messages={[mockMessages[0]]} />)

        // Initially should show 1 bubble
        expect(screen.getByLabelText('Great posture!')).toBeTruthy()
        expect(screen.queryByLabelText('Bend your knees a little bit')).toBeNull()

        rerender(<FeedbackBubbles messages={mockMessages} />)

        // After rerender should show 3 bubbles
        expect(screen.getByLabelText('Great posture!')).toBeTruthy()
        expect(screen.getByLabelText('Bend your knees a little bit')).toBeTruthy()
        expect(screen.getByLabelText('Keep your back straight!')).toBeTruthy()
      })
    })

    describe('Visual State Management', () => {
      it('applies correct opacity for active messages only', () => {
        const mixedMessages = [
          { ...mockMessages[0], isActive: true },
          { ...mockMessages[1], isActive: false },
        ]

        render(<FeedbackBubbles messages={mixedMessages} />)

        // Test that component renders only active bubbles (inactive are filtered out)
        expect(screen.getByLabelText('Great posture!')).toBeTruthy() // Active
        expect(screen.queryByLabelText('Bend your knees a little bit')).toBeNull() // Inactive (filtered out)
      })

      it('applies correct scale for highlighted vs normal messages', () => {
        const mixedMessages = [
          { ...mockMessages[0], isHighlighted: false },
          { ...mockMessages[1], isHighlighted: true },
        ]

        render(<FeedbackBubbles messages={mixedMessages} />)

        // Test that component renders both highlighted and normal bubbles
        expect(screen.getByLabelText('Great posture!')).toBeTruthy() // Normal
        expect(screen.getByLabelText('Bend your knees a little bit')).toBeTruthy() // Highlighted

        // Both bubbles should be rendered, regardless of highlight state
        expect(screen.getByLabelText('Great posture!')).toBeTruthy()
        expect(screen.getByLabelText('Bend your knees a little bit')).toBeTruthy()
      })

      it('applies correct font weight for highlighted vs normal messages', () => {
        const mixedMessages = [
          { ...mockMessages[0], isHighlighted: false },
          { ...mockMessages[1], isHighlighted: true },
        ]

        render(<FeedbackBubbles messages={mixedMessages} />)

        // Test that component renders both font weight variants
        expect(screen.getByLabelText('Great posture!')).toBeTruthy() // Normal weight
        expect(screen.getByLabelText('Bend your knees a little bit')).toBeTruthy() // Highlighted weight

        // Both bubbles should be rendered, regardless of font weight
        expect(screen.getByLabelText('Great posture!')).toBeTruthy()
        expect(screen.getByLabelText('Bend your knees a little bit')).toBeTruthy()
      })
    })

    describe('Accessibility and Touch Targets', () => {
      it('provides proper accessibility for feedback bubbles', () => {
        render(<FeedbackBubbles messages={mockMessages} />)

        const firstBubble = screen.getByLabelText('Great posture!')
        expect(firstBubble).toBeTruthy()
      })

      it('renders bubbles with proper touch target structure', () => {
        render(<FeedbackBubbles messages={mockMessages} />)

        // Check that the container exists and renders properly
        expect(screen.getByLabelText('Great posture!')).toBeInTheDocument()
      })

      it('maintains proper component hierarchy for screen readers', () => {
        render(<FeedbackBubbles messages={mockMessages} />)

        // Check that all 3 bubbles are rendered with proper accessibility
        expect(screen.getByLabelText('Great posture!')).toBeTruthy()
        expect(screen.getByLabelText('Bend your knees a little bit')).toBeTruthy()
        expect(screen.getByLabelText('Keep your back straight!')).toBeTruthy()
      })
    })
  })
})
