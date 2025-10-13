import { render } from '@testing-library/react-native'
import { Text } from 'tamagui'
import { TestProvider } from '../../test-utils'
import { GlassBackground } from './GlassBackground'

describe('GlassBackground', () => {
  // Arrange
  const renderComponent = (props = {}) =>
    render(
      <TestProvider>
        <GlassBackground {...props}>
          <Text>Test Content</Text>
        </GlassBackground>
      </TestProvider>
    )

  it('should render children inside glass background', () => {
    // Act
    const { root } = renderComponent()

    // Assert
    expect(root.findByType('div').props.children).toBeTruthy()
  })

  it('should apply default testID', () => {
    // Act
    const { getByTestId } = renderComponent()

    // Assert
    expect(getByTestId('glass-background')).toBeTruthy()
    expect(getByTestId('glass-background-image')).toBeTruthy()
  })

  it('should apply custom testID', () => {
    // Act
    const { getByTestId } = renderComponent({ testID: 'custom-glass' })

    // Assert
    expect(getByTestId('custom-glass')).toBeTruthy()
    expect(getByTestId('custom-glass-image')).toBeTruthy()
  })

  it('should accept Tamagui YStack props', () => {
    // Act
    const { getByTestId } = renderComponent({
      backgroundColor: '$color3',
      padding: '$4',
    })

    // Assert
    const container = getByTestId('glass-background')
    expect(container).toBeTruthy()
  })

  it('should render with custom source and resizeMode', () => {
    // Arrange
    const customSource = { uri: 'https://example.com/custom-gradient.png' }

    // Act
    const { getByTestId } = renderComponent({
      source: customSource,
      resizeMode: 'cover',
    })

    // Assert
    expect(getByTestId('glass-background-image')).toBeTruthy()
  })
})
