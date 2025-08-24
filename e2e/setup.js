const { device, element, by, waitFor } = require('detox')

// Increase timeout for CI environments
jasmine.DEFAULT_TIMEOUT_INTERVAL = 120000

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
beforeEach(async () => {
  await device.reloadReactNative()
})

afterEach(async () => {
  // Take screenshot on test failure
  if (jasmine.currentTest && jasmine.currentTest.failedExpectations.length > 0) {
    const testName = jasmine.currentTest.fullName.replace(/\s+/g, '_')
    await device.takeScreenshot(`failed_${testName}`)
  }
})

// Global error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
})

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
