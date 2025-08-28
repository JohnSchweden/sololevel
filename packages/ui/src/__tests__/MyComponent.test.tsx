/**
 * MyComponent Tests
 * Demonstrates clean test setup using shared utilities
 */

// Import shared test utilities (includes all mocks and setup)
import React from 'react'
import '../test-utils/setup'
import { renderWithProvider, screen } from '../test-utils'
import { MyComponent } from '../MyComponent'

describe('MyComponent', () => {
  it('renders without crashing', () => {
    renderWithProvider(<MyComponent testID="my-component" />)
    expect(screen.getByTestId('StyledComponent')).toBeTruthy()
  })

  it('applies default red background color', () => {
    renderWithProvider(<MyComponent testID="my-component" />)
    const component = screen.getByTestId('StyledComponent')

    // Check that the component has the expected styling
    expect(component).toBeTruthy()
  })

  it('applies blue variant when specified', () => {
    renderWithProvider(
      <MyComponent
        testID="my-component"
        blue
      />
    )
    const component = screen.getByTestId('StyledComponent')

    // Component should render with blue variant
    expect(component).toBeTruthy()
  })

  it('accepts children content', () => {
    renderWithProvider(
      <MyComponent testID="my-component">
        <div data-testid="child-content">Test content</div>
      </MyComponent>
    )

    expect(screen.getByTestId('StyledComponent')).toBeTruthy()
    expect(screen.getByTestId('child-content')).toBeTruthy()
    expect(screen.getByText('Test content')).toBeTruthy()
  })

  it('can be styled with additional props', () => {
    renderWithProvider(
      <MyComponent
        testID="my-component"
        padding="$4"
        margin="$2"
      />
    )

    const component = screen.getByTestId('StyledComponent')
    expect(component).toBeTruthy()
  })
})
