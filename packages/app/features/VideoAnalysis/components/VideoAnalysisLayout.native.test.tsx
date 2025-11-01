import { toggleControlsVisibilityOnTap } from './toggleControlsVisibility'

describe('toggleControlsVisibilityOnTap', () => {
  it('shows controls when currently hidden', () => {
    const callback = jest.fn()

    toggleControlsVisibilityOnTap(false, callback)

    expect(callback).toHaveBeenCalledWith(true, true)
  })

  it('hides controls when currently visible', () => {
    const callback = jest.fn()

    toggleControlsVisibilityOnTap(true, callback)

    expect(callback).toHaveBeenCalledWith(false, true)
  })
})
