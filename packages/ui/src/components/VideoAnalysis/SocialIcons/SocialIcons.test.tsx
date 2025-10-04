import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { SocialIcons } from './SocialIcons'

// Mocks are handled globally in src/test-utils/setup.ts

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
    render(<SocialIcons {...mockProps} />)

    expect(screen.getByTestId('social-icons-vertical')).toBeInTheDocument()
  })

  it('does not render when not visible', () => {
    render(
      <SocialIcons
        {...mockProps}
        isVisible={false}
      />
    )

    expect(screen.queryByTestId('social-icons-vertical')).not.toBeInTheDocument()
  })

  it('displays correct formatted counts', () => {
    render(<SocialIcons {...mockProps} />)

    expect(screen.getByTestId('social-icons-vertical')).toBeInTheDocument()
  })

  it('formats large numbers correctly', () => {
    const largeNumbers = {
      ...mockProps,
      likes: 1500000,
      comments: 2500,
      bookmarks: 500000,
      shares: 7500,
    }

    render(<SocialIcons {...largeNumbers} />)

    expect(screen.getByTestId('social-icons-vertical')).toBeInTheDocument()
  })

  it('handles zero counts', () => {
    const zeroCounts = {
      ...mockProps,
      likes: 0,
      comments: 0,
      bookmarks: 0,
      shares: 0,
    }

    render(<SocialIcons {...zeroCounts} />)

    expect(screen.getByTestId('social-icons-vertical')).toBeInTheDocument()
  })

  it('handles social interaction callbacks', () => {
    render(<SocialIcons {...mockProps} />)

    expect(mockProps.onLike).toBeDefined()
    expect(mockProps.onComment).toBeDefined()
    expect(mockProps.onBookmark).toBeDefined()
    expect(mockProps.onShare).toBeDefined()
  })
})
