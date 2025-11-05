import { Text, YStack } from 'tamagui'
import { renderWithProvider } from '../../../test-utils'
import { LazySection } from './LazySection'

describe('LazySection', () => {
  describe('Rendering', () => {
    it('should render placeholder initially when not visible', () => {
      // Arrange & Act
      const { getByTestId } = renderWithProvider(
        <YStack height={1000}>
          <LazySection testID="lazy-section">
            <Text>Content</Text>
          </LazySection>
        </YStack>
      )

      // Assert
      expect(getByTestId('lazy-section-placeholder')).toBeInTheDocument()
      expect(() => getByTestId('lazy-section-content')).toThrow()
    })

    it('should render content when visible prop is true', () => {
      // Arrange & Act
      const { getByTestId, getByText } = renderWithProvider(
        <LazySection
          testID="lazy-section"
          isVisible={true}
        >
          <Text>Content</Text>
        </LazySection>
      )

      // Assert
      expect(getByTestId('lazy-section-content')).toBeInTheDocument()
      expect(getByText('Content')).toBeInTheDocument()
    })

    it('should render content when isVisible transitions from false to true', () => {
      // Arrange
      const { rerender, getByTestId, queryByTestId } = renderWithProvider(
        <LazySection
          testID="lazy-section"
          isVisible={false}
        >
          <Text>Content</Text>
        </LazySection>
      )

      // Assert - initially shows placeholder
      expect(queryByTestId('lazy-section-content')).not.toBeInTheDocument()

      // Act - make visible
      rerender(
        <LazySection
          testID="lazy-section"
          isVisible={true}
        >
          <Text>Content</Text>
        </LazySection>
      )

      // Assert - now shows content
      expect(getByTestId('lazy-section-content')).toBeInTheDocument()
    })
  })

  describe('Placeholder', () => {
    it('should render placeholder with correct height', () => {
      // Arrange & Act
      const { getByTestId } = renderWithProvider(
        <LazySection
          testID="lazy-section"
          placeholderHeight={200}
        >
          <Text>Content</Text>
        </LazySection>
      )

      // Assert
      const placeholder = getByTestId('lazy-section-placeholder')
      expect(placeholder).toHaveStyle({ height: 200 })
    })

    it('should use default placeholder height when not provided', () => {
      // Arrange & Act
      const { getByTestId } = renderWithProvider(
        <LazySection testID="lazy-section">
          <Text>Content</Text>
        </LazySection>
      )

      // Assert
      const placeholder = getByTestId('lazy-section-placeholder')
      expect(placeholder).toHaveStyle({ height: 100 })
    })
  })

  describe('Performance', () => {
    it('should not render children in DOM when not visible', () => {
      // Arrange & Act
      const { queryByText, getByTestId } = renderWithProvider(
        <LazySection
          testID="lazy-section"
          isVisible={false}
        >
          <Text>Expensive Content</Text>
        </LazySection>
      )

      // Assert - content should not be in DOM when not visible
      expect(queryByText('Expensive Content')).not.toBeInTheDocument()
      expect(getByTestId('lazy-section-placeholder')).toBeInTheDocument()
    })

    it('should render children in DOM when visible', () => {
      // Arrange & Act
      const { getByText } = renderWithProvider(
        <LazySection
          testID="lazy-section"
          isVisible={true}
        >
          <Text>Expensive Content</Text>
        </LazySection>
      )

      // Assert - content should be in DOM when visible
      expect(getByText('Expensive Content')).toBeInTheDocument()
    })
  })
})
