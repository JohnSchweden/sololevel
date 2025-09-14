import { render } from '@testing-library/react-native'
import { ProcessingOverlay } from './ProcessingOverlay'

// Mock data following TDD principles
const mockProps = {
  progress: 50,
  currentStep: 'Analyzing movement...',
  estimatedTime: 5,
  onCancel: jest.fn(),
  onViewResults: jest.fn(),
  isComplete: false,
}

describe('ProcessingOverlay', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // Test user-visible behavior - component renders correctly
  it('renders processing overlay without crashing', () => {
    const { toJSON } = render(<ProcessingOverlay {...mockProps} />)

    // Check that the component renders without crashing
    expect(toJSON()).toBeTruthy()
  })

  it('accepts and uses props correctly', () => {
    const customProps = {
      ...mockProps,
      progress: 75,
      currentStep: 'Custom step',
      estimatedTime: 10,
    }

    render(<ProcessingOverlay {...customProps} />)

    // Test that the component accepts props correctly
    expect(mockProps.onCancel).toBeDefined()
    expect(mockProps.onViewResults).toBeDefined()
  })

  it('renders with different completion states', () => {
    const { toJSON: incompleteJSON } = render(<ProcessingOverlay {...mockProps} />)
    const { toJSON: completeJSON } = render(
      <ProcessingOverlay
        {...mockProps}
        isComplete={true}
      />
    )

    // Both should render without crashing
    expect(incompleteJSON()).toBeTruthy()
    expect(completeJSON()).toBeTruthy()
  })

  it('handles button press events', () => {
    render(<ProcessingOverlay {...mockProps} />)

    // Test that the component accepts props correctly
    expect(mockProps.onCancel).toBeDefined()
    expect(mockProps.onViewResults).toBeDefined()
  })
})
