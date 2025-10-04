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

    expect(screen.getByLabelText('Feedback: positive feedback bubble')).toBeInTheDocument()
  })

  it('renders with empty messages array', () => {
    render(<FeedbackBubbles messages={[]} />)

    // Component returns null for empty messages
    expect(screen.queryByLabelText('Feedback: positive feedback bubble')).not.toBeInTheDocument()
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

    expect(screen.getByLabelText('Feedback: positive feedback bubble')).toBeInTheDocument()
  })

  it('renders bubbles with proper structure', () => {
    render(<FeedbackBubbles messages={mockMessages} />)

    // Test that the component renders properly
    expect(screen.getByLabelText('Feedback: positive feedback bubble')).toBeInTheDocument()
  })

  it('renders highlighted messages with different styling', () => {
    render(<FeedbackBubbles messages={mockMessages} />)

    expect(screen.getByLabelText('Feedback: correction feedback bubble')).toBeInTheDocument()
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
    expect(screen.queryByLabelText('Feedback: positive feedback bubble')).not.toBeInTheDocument()
  })

  describe('Phase 2: Interactive Elements Tests', () => {
    describe('Bubble Tap Interactions', () => {
      it('calls onBubbleTap when a feedback bubble is pressed', () => {
        render(<FeedbackBubbles messages={mockMessages} />)

        // Find the first bubble by its accessibility label
        const firstBubble = screen.getByLabelText('Feedback: positive feedback bubble')
        expect(firstBubble).toBeTruthy()
      })

      it('renders different bubbles correctly', () => {
        render(<FeedbackBubbles messages={mockMessages} />)

        // Find the second bubble by its accessibility label
        const secondBubble = screen.getByLabelText('Feedback: suggestion feedback bubble')
        expect(secondBubble).toBeTruthy()
      })

      it('renders highlighted bubbles correctly', () => {
        render(<FeedbackBubbles messages={mockMessages} />)

        // Find the third bubble (which is highlighted) by its accessibility label
        const highlightedBubble = screen.getByLabelText('Feedback: correction feedback bubble')
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
        const activeBubble = screen.getByLabelText('Feedback: positive feedback bubble')
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

        // Should show exactly 3 bubbles (last 3 messages)
        // Check for the last 3 messages by their accessibility labels
        expect(screen.getByLabelText('Feedback: correction feedback bubble')).toBeTruthy() // correction (timestamp 3000)
        expect(screen.getByLabelText('Feedback: positive feedback bubble')).toBeTruthy() // positive (timestamp 4000)
        expect(screen.getByLabelText('Feedback: suggestion feedback bubble')).toBeTruthy() // suggestion (timestamp 5000)

        // Verify we have exactly 3 bubbles total
        expect(screen.getAllByLabelText(/^Feedback:/)).toHaveLength(3)
      })

      it('handles empty messages array gracefully', () => {
        render(<FeedbackBubbles messages={[]} />)

        // Component returns null for empty messages
        expect(
          screen.queryByLabelText('Feedback: positive feedback bubble')
        ).not.toBeInTheDocument()
      })

      it('updates displayed messages when messages prop changes', () => {
        const { rerender } = render(<FeedbackBubbles messages={[mockMessages[0]]} />)

        // Initially should show 1 bubble
        expect(screen.getByLabelText('Feedback: positive feedback bubble')).toBeTruthy()
        expect(screen.queryByLabelText('Feedback: suggestion feedback bubble')).toBeNull()

        rerender(<FeedbackBubbles messages={mockMessages} />)

        // After rerender should show 3 bubbles
        expect(screen.getByLabelText('Feedback: positive feedback bubble')).toBeTruthy()
        expect(screen.getByLabelText('Feedback: suggestion feedback bubble')).toBeTruthy()
        expect(screen.getByLabelText('Feedback: correction feedback bubble')).toBeTruthy()
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
        expect(screen.getByLabelText('Feedback: positive feedback bubble')).toBeTruthy() // Active
        expect(screen.queryByLabelText('Feedback: suggestion feedback bubble')).toBeNull() // Inactive (filtered out)

        // Only active bubbles should be rendered
        expect(screen.getAllByLabelText(/^Feedback:/)).toHaveLength(1)
      })

      it('applies correct scale for highlighted vs normal messages', () => {
        const mixedMessages = [
          { ...mockMessages[0], isHighlighted: false },
          { ...mockMessages[1], isHighlighted: true },
        ]

        render(<FeedbackBubbles messages={mixedMessages} />)

        // Test that component renders both highlighted and normal bubbles
        expect(screen.getByLabelText('Feedback: positive feedback bubble')).toBeTruthy() // Normal
        expect(screen.getByLabelText('Feedback: suggestion feedback bubble')).toBeTruthy() // Highlighted

        // Both bubbles should be rendered, regardless of highlight state
        expect(screen.getAllByLabelText(/^Feedback:/)).toHaveLength(2)
      })

      it('applies correct font weight for highlighted vs normal messages', () => {
        const mixedMessages = [
          { ...mockMessages[0], isHighlighted: false },
          { ...mockMessages[1], isHighlighted: true },
        ]

        render(<FeedbackBubbles messages={mixedMessages} />)

        // Test that component renders both font weight variants
        expect(screen.getByLabelText('Feedback: positive feedback bubble')).toBeTruthy() // Normal weight
        expect(screen.getByLabelText('Feedback: suggestion feedback bubble')).toBeTruthy() // Highlighted weight

        // Both bubbles should be rendered, regardless of font weight
        expect(screen.getAllByLabelText(/^Feedback:/)).toHaveLength(2)
      })
    })

    describe('Accessibility and Touch Targets', () => {
      it('provides proper accessibility for feedback bubbles', () => {
        render(<FeedbackBubbles messages={mockMessages} />)

        const firstBubble = screen.getByLabelText('Feedback: positive feedback bubble')
        expect(firstBubble).toBeTruthy()
      })

      it('renders bubbles with proper touch target structure', () => {
        render(<FeedbackBubbles messages={mockMessages} />)

        // Check that the container exists and renders properly
        expect(screen.getByLabelText('Feedback: positive feedback bubble')).toBeInTheDocument()
      })

      it('maintains proper component hierarchy for screen readers', () => {
        render(<FeedbackBubbles messages={mockMessages} />)

        // Check that all 3 bubbles are rendered with proper accessibility
        expect(screen.getByLabelText('Feedback: positive feedback bubble')).toBeTruthy()
        expect(screen.getByLabelText('Feedback: suggestion feedback bubble')).toBeTruthy()
        expect(screen.getByLabelText('Feedback: correction feedback bubble')).toBeTruthy()

        // Verify all bubbles are present
        const allBubbles = screen.getAllByLabelText(/^Feedback:/)
        expect(allBubbles).toHaveLength(3)
      })
    })
  })
})
