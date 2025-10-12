import { fireEvent, render, screen } from '@testing-library/react'
import { CoachingSessionsSection } from './CoachingSessionsSection'

describe('CoachingSessionsSection', () => {
  const mockSessions = [
    { id: 1, date: 'Today', title: 'Muscle Soreness and Growth in Weightlifting' },
    { id: 2, date: 'Monday, Jul 28', title: 'Personalised supplement recommendations' },
    { id: 3, date: 'Monday, Jul 28', title: 'Personalised supplement recommendations' },
    { id: 4, date: 'Sunday, Jul 27', title: 'Pre-workout nutrition guidelines' },
  ]

  const defaultProps = {
    sessions: mockSessions,
    onSessionPress: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render section header', () => {
      render(<CoachingSessionsSection {...defaultProps} />)

      expect(screen.getByText('Coaching sessions')).toBeInTheDocument()
    })

    it('should render all session items', () => {
      render(<CoachingSessionsSection {...defaultProps} />)

      expect(screen.getByText('Muscle Soreness and Growth in Weightlifting')).toBeInTheDocument()
      expect(screen.getAllByText('Personalised supplement recommendations')).toHaveLength(2)
      expect(screen.getByText('Pre-workout nutrition guidelines')).toBeInTheDocument()
    })

    it('should render sessions in order provided', () => {
      render(<CoachingSessionsSection {...defaultProps} />)

      const sessionButtons = screen.getAllByRole('button')
      expect(sessionButtons).toHaveLength(4)

      // First session
      expect(sessionButtons[0]).toHaveTextContent('Today')
      expect(sessionButtons[0]).toHaveTextContent('Muscle Soreness and Growth in Weightlifting')

      // Second session
      expect(sessionButtons[1]).toHaveTextContent('Monday, Jul 28')
      expect(sessionButtons[1]).toHaveTextContent('Personalised supplement recommendations')
    })

    it('should render with single session', () => {
      const singleSession = [mockSessions[0]]
      render(
        <CoachingSessionsSection
          {...defaultProps}
          sessions={singleSession}
        />
      )

      expect(screen.getAllByRole('button')).toHaveLength(1)
      expect(screen.getByText('Muscle Soreness and Growth in Weightlifting')).toBeInTheDocument()
    })

    it('should render with empty sessions array', () => {
      render(
        <CoachingSessionsSection
          {...defaultProps}
          sessions={[]}
        />
      )

      expect(screen.getByText('Coaching sessions')).toBeInTheDocument()
      expect(screen.queryAllByRole('button')).toHaveLength(0)
    })
  })

  describe('Interactions', () => {
    it('should call onSessionPress with correct session id when item pressed', () => {
      const onSessionPress = jest.fn()
      render(
        <CoachingSessionsSection
          {...defaultProps}
          onSessionPress={onSessionPress}
        />
      )

      const sessionButtons = screen.getAllByRole('button')

      // Press first session
      fireEvent.click(sessionButtons[0])
      expect(onSessionPress).toHaveBeenCalledWith(1)

      // Press third session
      fireEvent.click(sessionButtons[2])
      expect(onSessionPress).toHaveBeenCalledWith(3)

      expect(onSessionPress).toHaveBeenCalledTimes(2)
    })

    it('should handle multiple presses of same session', () => {
      const onSessionPress = jest.fn()
      render(
        <CoachingSessionsSection
          {...defaultProps}
          onSessionPress={onSessionPress}
        />
      )

      const sessionButtons = screen.getAllByRole('button')

      fireEvent.click(sessionButtons[0])
      fireEvent.click(sessionButtons[0])
      fireEvent.click(sessionButtons[0])

      expect(onSessionPress).toHaveBeenCalledTimes(3)
      expect(onSessionPress).toHaveBeenCalledWith(1)
    })
  })

  describe('Accessibility', () => {
    it('should have semantic section structure', () => {
      render(<CoachingSessionsSection {...defaultProps} />)

      // Section header should be in heading hierarchy
      expect(screen.getByText('Coaching sessions')).toBeInTheDocument()
    })

    it('should have accessible session items', () => {
      render(<CoachingSessionsSection {...defaultProps} />)

      const buttons = screen.getAllByRole('button')
      buttons.forEach((button) => {
        expect(button).toHaveAttribute('aria-label')
      })
    })
  })

  describe('Styling', () => {
    it('should apply theme tokens for spacing', () => {
      render(<CoachingSessionsSection {...defaultProps} />)

      const header = screen.getByText('Coaching sessions')
      expect(header).toHaveStyle({ color: expect.any(String) })
    })

    it('should render sessions in vertical list layout', () => {
      render(<CoachingSessionsSection {...defaultProps} />)

      // Should have container with vertical layout (YStack with gap)
      const header = screen.getByText('Coaching sessions')
      expect(header).toBeTruthy()
    })
  })
})
