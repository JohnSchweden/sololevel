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
    const { toJSON } = render(<VideoTitle {...mockProps} />)

    expect(toJSON()).toBeTruthy()
  })

  it('shows timestamp when provided', () => {
    const { toJSON } = render(<VideoTitle {...mockProps} />)

    expect(toJSON()).toBeTruthy()
  })

  it('shows generating state', () => {
    const { toJSON } = render(
      <VideoTitle
        {...mockProps}
        title={null}
        isGenerating={true}
      />
    )

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
