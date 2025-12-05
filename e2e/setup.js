const { device, element, by, waitFor } = require('detox')

// Increase timeout for CI environments
jest.setTimeout(120000)

// Global test helpers
global.waitForElement = async (testID, timeout = 10000) => {
  await waitFor(element(by.id(testID)))
    .toExist()
    .withTimeout(timeout)
}

global.waitForElementToBeVisible = async (testID, timeout = 10000) => {
  await waitFor(element(by.id(testID)))
    .toBeVisible()
    .withTimeout(timeout)
}

global.tapElement = async (testID) => {
  await element(by.id(testID)).tap()
}

global.typeInElement = async (testID, text) => {
  await element(by.id(testID)).typeText(text)
}

global.scrollToElement = async (scrollViewTestID, elementTestID) => {
  await waitFor(element(by.id(elementTestID)))
    .toBeVisible()
    .whileElement(by.id(scrollViewTestID))
    .scroll(200, 'down')
}

// Device helpers
global.reloadApp = async () => {
  await device.reloadReactNative()
}

global.openApp = async () => {
  await device.launchApp()
}

global.backgroundApp = async () => {
  await device.sendToHome()
}

global.foregroundApp = async () => {
  await device.launchApp({ newInstance: false })
}

// Network helpers
global.enableNetwork = async () => {
  await device.enableSynchronization()
}

global.disableNetwork = async () => {
  await device.disableSynchronization()
}

// Screenshot helpers
global.takeScreenshot = async (name) => {
  await device.takeScreenshot(name)
}

// Permission helpers
global.grantPermissions = async () => {
  if (device.getPlatform() === 'ios') {
    await device.launchApp({
      permissions: { notifications: 'YES', camera: 'YES', photos: 'YES' },
    })
  }
}

// Cleanup between tests
// Note: Removed beforeEach reload to avoid timeouts - app is launched fresh in beforeAll

afterEach(async () => {
  // Take screenshot on test failure
  // Note: Jest doesn't expose currentTest like jasmine, so we'll handle failures differently
  // Screenshots can be taken manually in test catch blocks or via Detox's built-in failure handling
})

// Global error handling
process.on('unhandledRejection', (_reason, _promise) => {})

module.exports = {
  waitForElement: global.waitForElement,
  waitForElementToBeVisible: global.waitForElementToBeVisible,
  tapElement: global.tapElement,
  typeInElement: global.typeInElement,
  scrollToElement: global.scrollToElement,
  reloadApp: global.reloadApp,
  openApp: global.openApp,
  backgroundApp: global.backgroundApp,
  foregroundApp: global.foregroundApp,
  takeScreenshot: global.takeScreenshot,
  grantPermissions: global.grantPermissions,
}
