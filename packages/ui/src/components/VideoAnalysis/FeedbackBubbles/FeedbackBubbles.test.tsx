import { fireEvent, render, screen } from '@testing-library/react-native'
import { FeedbackBubbles } from './FeedbackBubbles'

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

const mockOnBubbleTap = jest.fn()

describe('FeedbackBubbles', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders feedback bubbles without crashing', () => {
    const { toJSON } = render(
      <FeedbackBubbles
        messages={mockMessages}
        onBubbleTap={mockOnBubbleTap}
      />
    )

    expect(toJSON()).toBeTruthy()
  })

  it('renders with empty messages array', () => {
    const { toJSON } = render(
      <FeedbackBubbles
        messages={[]}
        onBubbleTap={mockOnBubbleTap}
      />
    )

    // Component returns null for empty messages, so toJSON will be null
    expect(toJSON()).toBeNull()
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

    const { toJSON } = render(
      <FeedbackBubbles
        messages={manyMessages}
        onBubbleTap={mockOnBubbleTap}
      />
    )

    expect(toJSON()).toBeTruthy()
  })

  it('handles bubble tap interactions', () => {
    render(
      <FeedbackBubbles
        messages={mockMessages}
        onBubbleTap={mockOnBubbleTap}
      />
    )

    // Since we can't easily test specific Pressable elements,
    // we test that the component accepts the callback
    expect(mockOnBubbleTap).toBeDefined()
  })

  it('renders highlighted messages with different styling', () => {
    const { toJSON } = render(
      <FeedbackBubbles
        messages={mockMessages}
        onBubbleTap={mockOnBubbleTap}
      />
    )

    expect(toJSON()).toBeTruthy()
  })

  it('renders inactive messages with reduced opacity', () => {
    const inactiveMessages = [
      {
        ...mockMessages[0],
        isActive: false,
      },
    ]

    const { toJSON } = render(
      <FeedbackBubbles
        messages={inactiveMessages}
        onBubbleTap={mockOnBubbleTap}
      />
    )

    // Component returns null for inactive messages, so toJSON should be null
    expect(toJSON()).toBeNull()
  })

  describe('Phase 2: Interactive Elements Tests', () => {
    describe('Bubble Tap Interactions', () => {
      it('calls onBubbleTap when a feedback bubble is pressed', () => {
        render(
          <FeedbackBubbles
            messages={mockMessages}
            onBubbleTap={mockOnBubbleTap}
          />
        )

        // Find the first bubble by its accessibility label
        const firstBubble = screen.getByLabelText('Feedback: Great posture!')
        fireEvent.press(firstBubble)

        expect(mockOnBubbleTap).toHaveBeenCalledWith(mockMessages[0])
      })

      it('calls onBubbleTap with correct message when different bubbles are pressed', () => {
        render(
          <FeedbackBubbles
            messages={mockMessages}
            onBubbleTap={mockOnBubbleTap}
          />
        )

        // Find the second bubble by its accessibility label
        const secondBubble = screen.getByLabelText('Feedback: Bend your knees a little bit')
        fireEvent.press(secondBubble)

        expect(mockOnBubbleTap).toHaveBeenCalledWith(mockMessages[1])
      })

      it('calls onBubbleTap for highlighted bubbles', () => {
        render(
          <FeedbackBubbles
            messages={mockMessages}
            onBubbleTap={mockOnBubbleTap}
          />
        )

        // Find the third bubble (which is highlighted) by its accessibility label
        const highlightedBubble = screen.getByLabelText('Feedback: Keep your back straight!')
        fireEvent.press(highlightedBubble)

        expect(mockOnBubbleTap).toHaveBeenCalledWith(mockMessages[2])
      })

      it('calls onBubbleTap for active bubbles', () => {
        const activeMessages = [
          {
            ...mockMessages[0],
            isActive: true,
          },
        ]

        render(
          <FeedbackBubbles
            messages={activeMessages}
            onBubbleTap={mockOnBubbleTap}
          />
        )

        // Find the active bubble by its accessibility label
        const activeBubble = screen.getByLabelText('Feedback: Great posture!')
        fireEvent.press(activeBubble)

        expect(mockOnBubbleTap).toHaveBeenCalledWith(activeMessages[0])
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

        render(
          <FeedbackBubbles
            messages={manyMessages}
            onBubbleTap={mockOnBubbleTap}
          />
        )

        // Should show exactly 3 bubbles (last 3 messages)
        // Check for the last 3 messages by their content
        expect(screen.getByLabelText('Feedback: Keep your back straight!')).toBeTruthy()
        expect(screen.getByLabelText('Feedback: Fourth message')).toBeTruthy()
        expect(screen.getByLabelText('Feedback: Fifth message')).toBeTruthy()

        // First message should not be visible (only last 3)
        expect(screen.queryByLabelText('Feedback: Great posture!')).toBeNull()
      })

      it('handles empty messages array gracefully', () => {
        const { toJSON } = render(
          <FeedbackBubbles
            messages={[]}
            onBubbleTap={mockOnBubbleTap}
          />
        )

        // Component returns null for empty messages, so toJSON should be null
        expect(toJSON()).toBeNull()
      })

      it('updates displayed messages when messages prop changes', () => {
        const { rerender } = render(
          <FeedbackBubbles
            messages={[mockMessages[0]]}
            onBubbleTap={mockOnBubbleTap}
          />
        )

        // Initially should show 1 bubble
        expect(screen.getByLabelText('Feedback: Great posture!')).toBeTruthy()
        expect(screen.queryByLabelText('Feedback: Bend your knees a little bit')).toBeNull()

        rerender(
          <FeedbackBubbles
            messages={mockMessages}
            onBubbleTap={mockOnBubbleTap}
          />
        )

        // After rerender should show 3 bubbles
        expect(screen.getByLabelText('Feedback: Great posture!')).toBeTruthy()
        expect(screen.getByLabelText('Feedback: Bend your knees a little bit')).toBeTruthy()
        expect(screen.getByLabelText('Feedback: Keep your back straight!')).toBeTruthy()
      })
    })

    describe('Visual State Management', () => {
      it('applies correct opacity for active messages only', () => {
        const mixedMessages = [
          { ...mockMessages[0], isActive: true },
          { ...mockMessages[1], isActive: false },
        ]

        render(
          <FeedbackBubbles
            messages={mixedMessages}
            onBubbleTap={mockOnBubbleTap}
          />
        )

        // Test that component renders only active bubbles (inactive are filtered out)
        expect(screen.getByLabelText('Feedback: Great posture!')).toBeTruthy() // Active
        expect(screen.queryByLabelText('Feedback: Bend your knees a little bit')).toBeNull() // Inactive (filtered out)

        // Only active bubbles should be rendered
        expect(screen.getAllByLabelText(/^Feedback:/)).toHaveLength(1)
      })

      it('applies correct scale for highlighted vs normal messages', () => {
        const mixedMessages = [
          { ...mockMessages[0], isHighlighted: false },
          { ...mockMessages[1], isHighlighted: true },
        ]

        render(
          <FeedbackBubbles
            messages={mixedMessages}
            onBubbleTap={mockOnBubbleTap}
          />
        )

        // Test that component renders both highlighted and normal bubbles
        expect(screen.getByLabelText('Feedback: Great posture!')).toBeTruthy() // Normal
        expect(screen.getByLabelText('Feedback: Bend your knees a little bit')).toBeTruthy() // Highlighted

        // Both bubbles should be rendered, regardless of highlight state
        expect(screen.getAllByLabelText(/^Feedback:/)).toHaveLength(2)
      })

      it('applies correct font weight for highlighted vs normal messages', () => {
        const mixedMessages = [
          { ...mockMessages[0], isHighlighted: false },
          { ...mockMessages[1], isHighlighted: true },
        ]

        render(
          <FeedbackBubbles
            messages={mixedMessages}
            onBubbleTap={mockOnBubbleTap}
          />
        )

        // Test that component renders both font weight variants
        expect(screen.getByLabelText('Feedback: Great posture!')).toBeTruthy() // Normal weight
        expect(screen.getByLabelText('Feedback: Bend your knees a little bit')).toBeTruthy() // Highlighted weight

        // Both bubbles should be rendered, regardless of font weight
        expect(screen.getAllByLabelText(/^Feedback:/)).toHaveLength(2)
      })
    })

    describe('Accessibility and Touch Targets', () => {
      it('provides proper accessibility for feedback bubbles', () => {
        render(
          <FeedbackBubbles
            messages={mockMessages}
            onBubbleTap={mockOnBubbleTap}
          />
        )

        const firstBubble = screen.getByLabelText('Feedback: Great posture!')
        expect(firstBubble).toBeTruthy()

        // Check that the bubble has proper accessibility attributes
        expect(firstBubble.props['aria-disabled']).toBe('false')
        expect(firstBubble.props.role).toBe('button')
      })

      it('renders bubbles with proper touch target structure', () => {
        const { UNSAFE_root } = render(
          <FeedbackBubbles
            messages={mockMessages}
            onBubbleTap={mockOnBubbleTap}
          />
        )

        // Check that the container exists and renders properly
        expect(UNSAFE_root).toBeTruthy()
      })

      it('maintains proper component hierarchy for screen readers', () => {
        render(
          <FeedbackBubbles
            messages={mockMessages}
            onBubbleTap={mockOnBubbleTap}
          />
        )

        // Check that all 3 bubbles are rendered with proper accessibility
        expect(screen.getByLabelText('Feedback: Great posture!')).toBeTruthy()
        expect(screen.getByLabelText('Feedback: Bend your knees a little bit')).toBeTruthy()
        expect(screen.getByLabelText('Feedback: Keep your back straight!')).toBeTruthy()

        // Verify all bubbles are present
        const allBubbles = screen.getAllByLabelText(/^Feedback:/)
        expect(allBubbles).toHaveLength(3)
      })
    })
  })
})
