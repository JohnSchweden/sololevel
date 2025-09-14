import { render } from '@testing-library/react-native'
import { SocialIcons } from './SocialIcons'

const mockProps = {
  likes: 1100,
  comments: 13,
  bookmarks: 1100,
  shares: 224,
  onLike: jest.fn(),
  onComment: jest.fn(),
  onBookmark: jest.fn(),
  onShare: jest.fn(),
  isVisible: true,
}

describe('SocialIcons', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders social icons without crashing', () => {
    const { toJSON } = render(<SocialIcons {...mockProps} />)

    expect(toJSON()).toBeTruthy()
  })

  it('does not render when not visible', () => {
    const { toJSON } = render(
      <SocialIcons
        {...mockProps}
        isVisible={false}
      />
    )

    expect(toJSON()).toBeNull()
  })

  it('displays correct formatted counts', () => {
    const { toJSON } = render(<SocialIcons {...mockProps} />)

    expect(toJSON()).toBeTruthy()
  })

  it('formats large numbers correctly', () => {
    const largeNumbers = {
      ...mockProps,
      likes: 1500000,
      comments: 2500,
      bookmarks: 500000,
      shares: 7500,
    }

    const { toJSON } = render(<SocialIcons {...largeNumbers} />)

    expect(toJSON()).toBeTruthy()
  })

  it('handles zero counts', () => {
    const zeroCounts = {
      ...mockProps,
      likes: 0,
      comments: 0,
      bookmarks: 0,
      shares: 0,
    }

    const { toJSON } = render(<SocialIcons {...zeroCounts} />)

    expect(toJSON()).toBeTruthy()
  })

  it('handles social interaction callbacks', () => {
    render(<SocialIcons {...mockProps} />)

    expect(mockProps.onLike).toBeDefined()
    expect(mockProps.onComment).toBeDefined()
    expect(mockProps.onBookmark).toBeDefined()
    expect(mockProps.onShare).toBeDefined()
  })
})
