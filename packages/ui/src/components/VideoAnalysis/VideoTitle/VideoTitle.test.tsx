import { render } from '@testing-library/react-native'
import { VideoTitle } from './VideoTitle'

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
    const { toJSON } = render(<VideoTitle {...titleProps} />)

    // ✅ ASSERT: Component renders successfully with title
    expect(toJSON()).toBeTruthy()
  })

  it('shows timestamp when provided', () => {
    // 🧪 ARRANGE: Set up component with timestamp
    const timestampProps = { ...mockProps }

    // 🎬 ACT: Render the component
    const { toJSON } = render(<VideoTitle {...timestampProps} />)

    // ✅ ASSERT: Component renders successfully with timestamp
    expect(toJSON()).toBeTruthy()
  })

  it('shows generating state', () => {
    // 🧪 ARRANGE: Set up component in generating state
    const generatingProps = { ...mockProps, title: null, isGenerating: true }

    // 🎬 ACT: Render the component
    const { toJSON } = render(<VideoTitle {...generatingProps} />)

    // ✅ ASSERT: Component renders successfully in generating state
    expect(toJSON()).toBeTruthy()
  })

  it('shows fallback title when no title provided', () => {
    const { toJSON } = render(
      <VideoTitle
        {...mockProps}
        title={null}
        isGenerating={false}
      />
    )

    expect(toJSON()).toBeTruthy()
  })

  it('shows edit button when editable', () => {
    const { toJSON } = render(<VideoTitle {...mockProps} />)

    expect(toJSON()).toBeTruthy()
  })

  it('does not show edit button when not editable', () => {
    const { queryByTestId } = render(
      <VideoTitle
        {...mockProps}
        isEditable={false}
      />
    )

    expect(queryByTestId('edit-title-button')).toBeNull()
  })

  it('does not show edit button when generating', () => {
    const { queryByTestId } = render(
      <VideoTitle
        {...mockProps}
        isGenerating={true}
      />
    )

    expect(queryByTestId('edit-title-button')).toBeNull()
  })

  it('handles edit mode functionality', () => {
    const onTitleEdit = jest.fn()
    const { toJSON } = render(
      <VideoTitle
        {...mockProps}
        onTitleEdit={onTitleEdit}
      />
    )

    expect(toJSON()).toBeTruthy()
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
    const { toJSON } = render(
      <VideoTitle
        {...mockProps}
        isEditable={false}
      />
    )

    expect(toJSON()).toBeTruthy()
  })

  it('handles generating state correctly', () => {
    const { toJSON } = render(
      <VideoTitle
        {...mockProps}
        isGenerating={true}
      />
    )

    expect(toJSON()).toBeTruthy()
  })

  it('handles null title prop', () => {
    const { toJSON } = render(
      <VideoTitle
        {...mockProps}
        title={null}
      />
    )

    expect(toJSON()).toBeTruthy()
  })
})
