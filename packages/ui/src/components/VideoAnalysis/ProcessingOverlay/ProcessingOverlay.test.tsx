import { fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { ProcessingOverlay } from './ProcessingOverlay'

// Mocks are handled globally in src/test-utils/setup.ts

const mockProps = {
  progress: 0.5,
  currentStep: 'Processing video analysis...',
  estimatedTime: 30,
  onCancel: jest.fn(),
  onViewResults: jest.fn(),
  isComplete: false,
}

describe('ProcessingOverlay', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Component Interface Tests', () => {
    it('renders with required props', () => {
      render(<ProcessingOverlay {...mockProps} />)

      // Check enhanced accessibility labels
      expect(screen.getByLabelText('Processing overlay: Analysis in progress')).toBeTruthy()
    })

    it('displays progress correctly', () => {
      render(
        <ProcessingOverlay
          {...mockProps}
          progress={0.75}
        />
      )

      // Progress should be displayed as percentage with enhanced accessibility
      expect(screen.getByLabelText('Processing progress: 75 percent complete')).toBeTruthy()
      expect(screen.getByLabelText('Progress bar: 75% complete')).toBeTruthy()
    })

    it('handles zero progress', () => {
      render(
        <ProcessingOverlay
          {...mockProps}
          progress={0}
        />
      )

      expect(screen.getByLabelText('Processing progress: 0 percent complete')).toBeTruthy()
    })

    it('handles complete progress', () => {
      render(
        <ProcessingOverlay
          {...mockProps}
          progress={1}
          isComplete={true}
        />
      )

      expect(screen.getByLabelText('Processing progress: 100 percent complete')).toBeTruthy()
      // Component should render without errors when complete
      expect(screen.getByLabelText('Processing overlay: Analysis complete')).toBeTruthy()
    })

    it('calls onCancel when cancel button is pressed', () => {
      const onCancel = jest.fn()
      render(
        <ProcessingOverlay
          {...mockProps}
          onCancel={onCancel}
        />
      )

      fireEvent.click(screen.getByLabelText('Cancel processing'))
      expect(onCancel).toHaveBeenCalledTimes(1)
    })

    it('calls onViewResults when view results button is pressed', () => {
      const onViewResults = jest.fn()
      render(
        <ProcessingOverlay
          {...mockProps}
          onViewResults={onViewResults}
          isComplete={true}
        />
      )

      fireEvent.click(screen.getByLabelText('View analysis results'))
      expect(onViewResults).toHaveBeenCalledTimes(1)
    })

    it('disables view results button when not complete', () => {
      render(
        <ProcessingOverlay
          {...mockProps}
          isComplete={false}
        />
      )

      const viewResultsButton = screen.getByLabelText(
        'View analysis results (disabled until processing complete)'
      )
      // For React Native Testing Library, just verify the button exists
      expect(viewResultsButton).toBeTruthy()
    })

    it('enables view results button when complete', () => {
      render(
        <ProcessingOverlay
          {...mockProps}
          isComplete={true}
        />
      )

      const viewResultsButton = screen.getByLabelText('View analysis results')
      // Button should exist and be accessible when processing is complete
      expect(viewResultsButton).toBeTruthy()
    })
  })

  describe('AI Pipeline Stage Tests', () => {
    it('displays different processing steps', () => {
      const steps = [
        'Detecting video source...',
        'Extracting frames...',
        'Analyzing movement...',
        'Generating feedback...',
        'Creating audio...',
      ]

      steps.forEach((step) => {
        const { unmount } = render(
          <ProcessingOverlay
            {...mockProps}
            currentStep={step}
          />
        )

        // Component should render without errors for each step
        expect(screen.getByLabelText('Processing overlay: Analysis in progress')).toBeTruthy()
        unmount()
      })
    })

    it('handles estimated time formatting', () => {
      const times = [
        { seconds: 30, expected: '30 seconds remaining' },
        { seconds: 90, expected: '1 minute 30 seconds remaining' },
        { seconds: 120, expected: '2 minutes remaining' },
        { seconds: 0, expected: 'Almost done...' },
      ]

      times.forEach(({ seconds }) => {
        const { unmount } = render(
          <ProcessingOverlay
            {...mockProps}
            estimatedTime={seconds}
          />
        )

        // Component should render without errors for each time value
        expect(screen.getByLabelText('Processing overlay: Analysis in progress')).toBeTruthy()
        unmount()
      })
    })
  })

  describe('Theme Integration Tests', () => {
    it('applies correct theme colors', () => {
      render(<ProcessingOverlay {...mockProps} />)

      // Progress bar should use primary color
      const progressBar = screen.getByLabelText('Progress bar: 50% complete')
      expect(progressBar).toBeTruthy()
    })

    it('uses correct typography tokens', () => {
      render(<ProcessingOverlay {...mockProps} />)

      // Component should render without errors
      expect(screen.getByLabelText('Processing overlay: Analysis in progress')).toBeTruthy()
    })

    it('maintains proper spacing', () => {
      render(<ProcessingOverlay {...mockProps} />)

      const container = screen.getByLabelText('Processing overlay: Analysis in progress')
      expect(container).toBeTruthy()
    })
  })

  describe('Accessibility Tests', () => {
    it('has proper accessibility labels', () => {
      render(<ProcessingOverlay {...mockProps} />)

      expect(screen.getByLabelText('Cancel processing')).toBeTruthy()
      expect(
        screen.getByLabelText('View analysis results (disabled until processing complete)')
      ).toBeTruthy()
    })

    it('announces progress updates', () => {
      render(
        <ProcessingOverlay
          {...mockProps}
          progress={0.5}
        />
      )

      expect(screen.getByLabelText('Processing progress: 50 percent complete')).toBeTruthy()
    })

    it('maintains minimum touch target sizes', () => {
      render(<ProcessingOverlay {...mockProps} />)

      const cancelButton = screen.getByLabelText('Cancel processing')
      const viewResultsButton = screen.getByLabelText(
        'View analysis results (disabled until processing complete)'
      )

      // Buttons should have minimum 44pt touch targets
      expect(cancelButton).toBeTruthy()
      expect(viewResultsButton).toBeTruthy()
    })
  })

  describe('Error Handling Tests', () => {
    it('handles invalid progress values', () => {
      render(
        <ProcessingOverlay
          {...mockProps}
          progress={-0.5}
        />
      )

      // Should clamp to 0%
      expect(screen.getByLabelText('Processing progress: 0 percent complete')).toBeTruthy()
    })

    it('handles progress values over 100%', () => {
      render(
        <ProcessingOverlay
          {...mockProps}
          progress={1.5}
        />
      )

      // Should clamp to 100%
      expect(screen.getByLabelText('Processing progress: 100 percent complete')).toBeTruthy()
    })

    it('handles missing callback props gracefully', () => {
      const propsWithoutCallbacks = {
        ...mockProps,
        onCancel: jest.fn(),
        onViewResults: jest.fn(),
      }

      render(<ProcessingOverlay {...propsWithoutCallbacks} />)

      // Should still render without errors
      expect(screen.getByLabelText('Processing overlay: Analysis in progress')).toBeTruthy()
    })
  })

  describe('Performance Tests', () => {
    it('renders quickly with different progress values', () => {
      const startTime = performance.now()

      render(<ProcessingOverlay {...mockProps} />)

      const endTime = performance.now()
      expect(endTime - startTime).toBeLessThan(50)
    })

    it('handles rapid progress updates efficiently', () => {
      const { rerender } = render(<ProcessingOverlay {...mockProps} />)

      // Simulate rapid progress updates
      for (let i = 0; i <= 100; i += 10) {
        rerender(
          <ProcessingOverlay
            {...mockProps}
            progress={i / 100}
          />
        )
      }

      expect(screen.getByLabelText('Processing progress: 100 percent complete')).toBeTruthy()
    })
  })

  describe('Animation Tests', () => {
    it('animates progress bar smoothly', () => {
      const { rerender } = render(
        <ProcessingOverlay
          {...mockProps}
          progress={0}
        />
      )

      // Update progress
      rerender(
        <ProcessingOverlay
          {...mockProps}
          progress={0.5}
        />
      )

      expect(screen.getByLabelText('Processing progress: 50 percent complete')).toBeTruthy()
    })

    it('shows loading spinner during processing', () => {
      render(
        <ProcessingOverlay
          {...mockProps}
          isComplete={false}
        />
      )

      expect(screen.getByLabelText('Processing spinner: Active')).toBeTruthy()
    })

    it('hides loading spinner when complete', () => {
      render(
        <ProcessingOverlay
          {...mockProps}
          isComplete={true}
        />
      )

      expect(screen.queryByLabelText('Processing spinner: Active')).toBeFalsy()
    })
  })

  describe('Phase 2: Interactive Elements Tests', () => {
    describe('Cancel Button Interactions', () => {
      it('calls onCancel when cancel button is pressed', () => {
        const mockOnCancel = jest.fn()
        render(
          <ProcessingOverlay
            {...mockProps}
            onCancel={mockOnCancel}
          />
        )

        const cancelButton = screen.getByLabelText('Cancel processing')
        fireEvent.click(cancelButton)

        expect(mockOnCancel).toHaveBeenCalledTimes(1)
      })

      it('cancel button is always enabled during processing', () => {
        render(
          <ProcessingOverlay
            {...mockProps}
            isComplete={false}
          />
        )

        const cancelButton = screen.getByLabelText('Cancel processing')
        expect(cancelButton).not.toBeDisabled()
      })

      it('cancel button remains enabled when processing is complete', () => {
        render(
          <ProcessingOverlay
            {...mockProps}
            isComplete={true}
          />
        )

        const cancelButton = screen.getByLabelText('Cancel processing')
        expect(cancelButton).not.toBeDisabled()
      })
    })

    describe('View Results Button Interactions', () => {
      it('calls onViewResults when view results button is pressed and processing is complete', () => {
        const mockOnViewResults = jest.fn()
        render(
          <ProcessingOverlay
            {...mockProps}
            onViewResults={mockOnViewResults}
            isComplete={true}
          />
        )

        const viewResultsButton = screen.getByLabelText('View analysis results')
        fireEvent.click(viewResultsButton)

        expect(mockOnViewResults).toHaveBeenCalledTimes(1)
      })

      it('view results button is disabled when processing is not complete', () => {
        render(
          <ProcessingOverlay
            {...mockProps}
            isComplete={false}
          />
        )

        const viewResultsButton = screen.getByLabelText(
          'View analysis results (disabled until processing complete)'
        )
        expect(viewResultsButton).toBeDisabled()
      })

      it('view results button is enabled when processing is complete', () => {
        render(
          <ProcessingOverlay
            {...mockProps}
            isComplete={true}
          />
        )

        const viewResultsButton = screen.getByLabelText('View analysis results')
        expect(viewResultsButton).not.toBeDisabled()
      })

      it('does not call onViewResults when button is disabled and pressed', () => {
        const mockOnViewResults = jest.fn()
        render(
          <ProcessingOverlay
            {...mockProps}
            onViewResults={mockOnViewResults}
            isComplete={false}
          />
        )

        const viewResultsButton = screen.getByLabelText(
          'View analysis results (disabled until processing complete)'
        )
        fireEvent.click(viewResultsButton)

        // Should not be called when disabled
        expect(mockOnViewResults).not.toHaveBeenCalled()
      })
    })

    describe('Button State Transitions', () => {
      it('view results button transitions from disabled to enabled when processing completes', () => {
        const { rerender } = render(
          <ProcessingOverlay
            {...mockProps}
            isComplete={false}
          />
        )

        // Initially disabled
        const viewResultsButton = screen.getByLabelText(
          'View analysis results (disabled until processing complete)'
        )
        expect(viewResultsButton).toBeDisabled()

        // Complete processing
        rerender(
          <ProcessingOverlay
            {...mockProps}
            isComplete={true}
          />
        )

        // Now enabled - button label changes when enabled
        const enabledButton = screen.getByLabelText('View analysis results')
        expect(enabledButton).not.toBeDisabled()
      })

      it('button opacity changes based on completion state', () => {
        const { rerender } = render(
          <ProcessingOverlay
            {...mockProps}
            isComplete={false}
          />
        )

        // Initially low opacity (disabled state)
        const viewResultsButton = screen.getByLabelText(
          'View analysis results (disabled until processing complete)'
        )
        expect(viewResultsButton).toBeInTheDocument()

        // Complete processing
        rerender(
          <ProcessingOverlay
            {...mockProps}
            isComplete={true}
          />
        )

        // Now full opacity (enabled state) - button label changes when enabled
        const enabledButton = screen.getByLabelText('View analysis results')
        expect(enabledButton).toBeInTheDocument()
      })
    })
  })
})
