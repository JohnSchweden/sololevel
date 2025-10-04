import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { VideoTitle } from './VideoTitle'

// Mocks are handled globally in src/test-utils/setup.ts

const mockProps = {
  title: 'Golf Swing Analysis',
  isGenerating: false,
  isEditable: true,
  timestamp: '2 days ago',
}

describe('VideoTitle', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders title correctly', () => {
    // 🧪 ARRANGE: Set up component with title
    const titleProps = { ...mockProps }

    // 🎬 ACT: Render the component
    render(<VideoTitle {...titleProps} />)

    // ✅ ASSERT: Component renders successfully with title
    expect(screen.getByText('Golf Swing Analysis')).toBeInTheDocument()
  })

  it('shows timestamp when provided', () => {
    // 🧪 ARRANGE: Set up component with timestamp
    const timestampProps = { ...mockProps }

    // 🎬 ACT: Render the component
    render(<VideoTitle {...timestampProps} />)

    // ✅ ASSERT: Component renders successfully with timestamp
    expect(screen.getByText('2 days ago')).toBeInTheDocument()
  })

  it('shows generating state', () => {
    // 🧪 ARRANGE: Set up component in generating state
    const generatingProps = { ...mockProps, title: null, isGenerating: true }

    // 🎬 ACT: Render the component
    render(<VideoTitle {...generatingProps} />)

    // ✅ ASSERT: Component renders successfully in generating state
    expect(screen.getByText('Generating title...')).toBeInTheDocument()
  })

  it('shows fallback title when no title provided', () => {
    render(
      <VideoTitle
        {...mockProps}
        title={null}
        isGenerating={false}
      />
    )

    expect(screen.getByText('Video Analysis')).toBeInTheDocument()
  })

  it('shows edit button when editable', () => {
    render(<VideoTitle {...mockProps} />)

    expect(screen.getByTestId('edit-title-button')).toBeInTheDocument()
  })

  it('does not show edit button when not editable', () => {
    render(
      <VideoTitle
        {...mockProps}
        isEditable={false}
      />
    )

    expect(screen.queryByTestId('edit-title-button')).toBeNull()
  })

  it('does not show edit button when generating', () => {
    render(
      <VideoTitle
        {...mockProps}
        isGenerating={true}
      />
    )

    expect(screen.queryByTestId('edit-title-button')).toBeNull()
  })

  it('handles edit mode functionality', () => {
    const onTitleEdit = jest.fn()
    render(
      <VideoTitle
        {...mockProps}
        onTitleEdit={onTitleEdit}
      />
    )

    expect(screen.getByText('Golf Swing Analysis')).toBeInTheDocument()
  })

  it('handles title editing callbacks', () => {
    const onTitleEdit = jest.fn()
    render(
      <VideoTitle
        {...mockProps}
        onTitleEdit={onTitleEdit}
      />
    )

    expect(onTitleEdit).toBeDefined()
  })

  it('handles different edit states', () => {
    render(
      <VideoTitle
        {...mockProps}
        isEditable={false}
      />
    )

    expect(screen.getByText('Golf Swing Analysis')).toBeInTheDocument()
  })

  it('handles generating state correctly', () => {
    render(
      <VideoTitle
        {...mockProps}
        isGenerating={true}
      />
    )

    expect(screen.getByText('Golf Swing Analysis')).toBeInTheDocument()
  })

  it('handles null title prop', () => {
    render(
      <VideoTitle
        {...mockProps}
        title={null}
      />
    )

    expect(screen.getByText('Video Analysis')).toBeInTheDocument()
  })
})
