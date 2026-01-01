import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { TestProvider } from '../../test-utils'
import { OptimizedImage } from './OptimizedImage'

// Mock Platform.OS to 'ios' so OptimizedImage uses ExpoImage (which is properly mocked)
jest.mock('react-native', () => {
  const React = require('react')
  return {
    Platform: {
      OS: 'ios',
      Version: 'jest',
      select: jest.fn((obj: any) => obj.ios || obj.default),
    },
  }
})

describe('OptimizedImage', () => {
  // Arrange
  const renderComponent = (props = {}) =>
    render(
      <TestProvider>
        <OptimizedImage
          source={{ uri: 'https://example.com/image.png' }}
          testID="test-image"
          {...props}
        />
      </TestProvider>
    )

  it('should render image with testID', () => {
    // Act
    renderComponent()

    // Assert
    expect(screen.getByTestId('test-image')).toBeInTheDocument()
  })

  it('should accept remote URL source', () => {
    // Arrange
    const remoteSource = { uri: 'https://example.com/image.png' }

    // Act
    renderComponent({ source: remoteSource })

    // Assert
    expect(screen.getByTestId('test-image')).toBeInTheDocument()
  })
})
