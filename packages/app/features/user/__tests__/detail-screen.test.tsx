import { vi } from "vitest"
import { render, screen } from '@testing-library/react'
import { UserDetailScreen } from '../detail-screen'

// Mock the solito navigation hook
vi.mock('solito/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
}))

describe('UserDetailScreen', () => {
  it('renders user ID when provided', () => {
    render(<UserDetailScreen id="test-user" />)
    expect(screen.getByTestId('user-detail-screen')).toBeInTheDocument()
    expect(screen.getByText('User ID: test-user')).toBeInTheDocument()
  })

  it('renders navigation button', () => {
    render(<UserDetailScreen id="test-user" />)
    expect(screen.getByText('Go Home')).toBeInTheDocument()
  })

  it('handles empty id gracefully', () => {
    const { container } = render(<UserDetailScreen id="" />)
    expect(container.firstChild).toBeNull()
  })

  it('handles undefined id gracefully', () => {
    const { container } = render(<UserDetailScreen id={undefined as any} />)
    expect(container.firstChild).toBeNull()
  })
})
