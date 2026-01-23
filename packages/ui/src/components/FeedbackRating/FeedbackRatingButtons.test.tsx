/**
 * TDD Tests for FeedbackRatingButtons Component
 * Tests thumbs up/down rating interaction with toggle behavior
 */

import { fireEvent, screen } from '@testing-library/react'
import { renderWithProvider } from '@ui/test-utils'
import { FeedbackRatingButtons } from './FeedbackRatingButtons'

describe('FeedbackRatingButtons', () => {
  const mockOnRatingChange = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('User Interactions', () => {
    it('calls onRatingChange with "up" when thumbs up clicked', () => {
      // Arrange: Render with no rating
      renderWithProvider(
        <FeedbackRatingButtons
          currentRating={null}
          onRatingChange={mockOnRatingChange}
        />
      )

      // Act: Click thumbs up button
      const thumbsUpButton = screen.getByLabelText('Rate as helpful')
      fireEvent.click(thumbsUpButton)

      // Assert: Callback called with 'up'
      expect(mockOnRatingChange).toHaveBeenCalledTimes(1)
      expect(mockOnRatingChange).toHaveBeenCalledWith('up')
    })

    it('calls onRatingChange with "down" when thumbs down clicked', () => {
      // Arrange: Render with no rating
      renderWithProvider(
        <FeedbackRatingButtons
          currentRating={null}
          onRatingChange={mockOnRatingChange}
        />
      )

      // Act: Click thumbs down button
      const thumbsDownButton = screen.getByLabelText('Rate as not helpful')
      fireEvent.click(thumbsDownButton)

      // Assert: Callback called with 'down'
      expect(mockOnRatingChange).toHaveBeenCalledTimes(1)
      expect(mockOnRatingChange).toHaveBeenCalledWith('down')
    })

    it('toggles rating off when same button clicked twice', () => {
      // Arrange: Render with 'up' rating
      renderWithProvider(
        <FeedbackRatingButtons
          currentRating="up"
          onRatingChange={mockOnRatingChange}
        />
      )

      // Act: Click thumbs up again (toggle off)
      const thumbsUpButton = screen.getByLabelText('Rate as helpful')
      fireEvent.click(thumbsUpButton)

      // Assert: Callback called with null to clear rating
      expect(mockOnRatingChange).toHaveBeenCalledWith(null)
    })

    it('switches rating when opposite button clicked', () => {
      // Arrange: Render with 'up' rating
      renderWithProvider(
        <FeedbackRatingButtons
          currentRating="up"
          onRatingChange={mockOnRatingChange}
        />
      )

      // Act: Click thumbs down (switch rating)
      const thumbsDownButton = screen.getByLabelText('Rate as not helpful')
      fireEvent.click(thumbsDownButton)

      // Assert: Callback called with 'down'
      expect(mockOnRatingChange).toHaveBeenCalledWith('down')
    })
  })

  describe('Disabled State', () => {
    it('does not call onRatingChange when disabled', () => {
      // Arrange: Render disabled buttons
      renderWithProvider(
        <FeedbackRatingButtons
          currentRating={null}
          onRatingChange={mockOnRatingChange}
          disabled={true}
        />
      )

      // Act: Attempt to click
      const thumbsUpButton = screen.getByLabelText('Rate as helpful')
      fireEvent.click(thumbsUpButton)

      // Assert: Callback not called
      expect(mockOnRatingChange).not.toHaveBeenCalled()
    })
  })
})
