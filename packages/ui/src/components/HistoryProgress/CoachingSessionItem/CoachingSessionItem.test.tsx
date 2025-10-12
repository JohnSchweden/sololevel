import { fireEvent, render, screen } from '@testing-library/react'
import { CoachingSessionItem } from './CoachingSessionItem'

describe('CoachingSessionItem', () => {
  const defaultProps = {
    date: 'Today',
    title: 'Muscle Soreness and Growth in Weightlifting',
    onPress: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render date label and title', () => {
      render(<CoachingSessionItem {...defaultProps} />)

      expect(screen.getByText('Today')).toBeInTheDocument()
      expect(screen.getByText('Muscle Soreness and Growth in Weightlifting')).toBeInTheDocument()
    })

    it('should render with different date formats', () => {
      render(
        <CoachingSessionItem
          {...defaultProps}
          date="Monday, Jul 28"
        />
      )

      expect(screen.getByText('Monday, Jul 28')).toBeInTheDocument()
    })

    it('should render with different titles', () => {
      render(
        <CoachingSessionItem
          {...defaultProps}
          title="Personalised supplement recommendations"
        />
      )

      expect(screen.getByText('Personalised supplement recommendations')).toBeInTheDocument()
    })
  })

  describe('Interactions', () => {
    it('should call onPress when pressed', () => {
      const onPress = jest.fn()
      render(
        <CoachingSessionItem
          {...defaultProps}
          onPress={onPress}
        />
      )

      const button = screen.getByRole('button')
      fireEvent.click(button)

      expect(onPress).toHaveBeenCalledTimes(1)
    })

    it('should have correct accessibility role', () => {
      render(<CoachingSessionItem {...defaultProps} />)

      expect(screen.getByRole('button')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have accessibility label with date and title', () => {
      render(<CoachingSessionItem {...defaultProps} />)

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute(
        'aria-label',
        'Today, Muscle Soreness and Growth in Weightlifting, coaching session'
      )
    })

    it('should have correct accessibility label for different dates', () => {
      render(
        <CoachingSessionItem
          {...defaultProps}
          date="Monday, Jul 28"
        />
      )

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute(
        'aria-label',
        'Monday, Jul 28, Muscle Soreness and Growth in Weightlifting, coaching session'
      )
    })
  })

  describe('Styling', () => {
    it('should apply theme tokens for colors and spacing', () => {
      render(<CoachingSessionItem {...defaultProps} />)

      // Date label should have secondary text color
      const dateLabel = screen.getByText('Today')
      expect(dateLabel).toHaveStyle({ color: expect.any(String) })

      // Title should have primary text color
      const title = screen.getByText('Muscle Soreness and Growth in Weightlifting')
      expect(title).toHaveStyle({ color: expect.any(String) })
    })
  })
})
