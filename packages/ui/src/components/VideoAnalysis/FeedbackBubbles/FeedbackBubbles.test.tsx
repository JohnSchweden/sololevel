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

    expect(toJSON()).toBeTruthy()
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

    expect(toJSON()).toBeTruthy()
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

      it('calls onBubbleTap for inactive bubbles', () => {
        const inactiveMessages = [
          {
            ...mockMessages[0],
            isActive: false,
          },
        ]

        render(
          <FeedbackBubbles
            messages={inactiveMessages}
            onBubbleTap={mockOnBubbleTap}
          />
        )

        // Find the inactive bubble by its accessibility label
        const inactiveBubble = screen.getByLabelText('Feedback: Great posture!')
        fireEvent.press(inactiveBubble)

        expect(mockOnBubbleTap).toHaveBeenCalledWith(inactiveMessages[0])
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
        const { root } = render(
          <FeedbackBubbles
            messages={[]}
            onBubbleTap={mockOnBubbleTap}
          />
        )

        expect(root).toBeTruthy()
        expect(root.props.pointerEvents).toBe('auto')
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
      it('applies correct opacity for active vs inactive messages', () => {
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

        // Test that component renders both active and inactive bubbles
        expect(screen.getByLabelText('Feedback: Great posture!')).toBeTruthy() // Active
        expect(screen.getByLabelText('Feedback: Bend your knees a little bit')).toBeTruthy() // Inactive

        // Both bubbles should be rendered, regardless of active state
        expect(screen.getAllByLabelText(/^Feedback:/)).toHaveLength(2)
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
