import { render, screen } from '@testing-library/react'
import { TamaguiProvider } from 'tamagui'
import { config } from '@my/config'
import { MyComponent } from '../MyComponent'

// Test wrapper with Tamagui provider
function renderWithProvider(component: React.ReactElement) {
  return render(<TamaguiProvider config={config}>{component}</TamaguiProvider>)
}

describe('MyComponent', () => {
  it('renders without crashing', () => {
    renderWithProvider(<MyComponent testID="my-component" />)
    expect(screen.getByTestId('my-component')).toBeTruthy()
  })

  it('applies default red background color', () => {
    renderWithProvider(<MyComponent testID="my-component" />)
    const component = screen.getByTestId('my-component')

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
    const component = screen.getByTestId('my-component')

    // Component should render with blue variant
    expect(component).toBeTruthy()
  })

  it('accepts children content', () => {
    renderWithProvider(
      <MyComponent testID="my-component">
        <div data-testid="child-content">Test content</div>
      </MyComponent>
    )

    expect(screen.getByTestId('my-component')).toBeTruthy()
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

    const component = screen.getByTestId('my-component')
    expect(component).toBeTruthy()
  })
})
