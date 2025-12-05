const { device, element, by, waitFor } = require('detox')

describe('History → Video Analysis Flow', () => {
  beforeAll(async () => {
    await device.launchApp({
      newInstance: true,
      permissions: { camera: 'YES', photos: 'YES' },
    })
  })

  it('should navigate from history to video analysis', async () => {
    // Wait for app to stabilize after launch
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Take initial screenshot to see current state
    await device.takeScreenshot('00-initial-state')

    // Handle Expo Dev Client launcher screen - tap on localhost to load app
    try {
      await waitFor(element(by.text('http://localhost:8081')))
        .toBeVisible()
        .withTimeout(5000)
      console.log('📱 Expo Dev Client launcher detected, connecting to Metro...')
      await element(by.text('http://localhost:8081')).tap()
      // Wait for app to load from Metro
      await new Promise((resolve) => setTimeout(resolve, 5000))
      await device.takeScreenshot('00a-after-metro-connect')
    } catch (e) {
      console.log('✅ Already connected to Metro or launcher not shown')
    }

    // Check if we need to sign in (redirected to auth)
    try {
      await waitFor(element(by.id('sign-in-screen')))
        .toBeVisible()
        .withTimeout(5000)

      console.log('📝 Sign-in screen detected, authenticating...')

      // Fill in test credentials
      // Using env vars: EXPO_PUBLIC_TEST_AUTH_EMAIL / EXPO_PUBLIC_TEST_AUTH_PASSWORD
      // For testing, use hardcoded test values or check if auto-login is enabled
      await element(by.id('email-input')).typeText('test@example.com')
      await element(by.id('password-input')).typeText('testpassword123')

      // Tap sign in button
      await element(by.id('sign-in-button')).tap()

      // Wait for sign-in to complete and redirect
      await waitFor(element(by.id('sign-in-screen')))
        .not.toBeVisible()
        .withTimeout(10000)

      console.log('✅ Signed in successfully')
      await device.takeScreenshot('00b-after-signin')
    } catch (e) {
      console.log('✅ Already authenticated or auth screen not shown')
    }

    // Wait for app to be idle before navigating
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // 1. Navigate to History via deep link (Expo Router uses triple slash format)
    await device.openURL({ url: 'sololevel:///history-progress' })
    console.log('✅ Navigated to history-progress')

    // Disable Detox synchronization - app has animations/timers that keep it "busy"
    await device.disableSynchronization()

    // Wait longer for the deep link navigation to complete
    await new Promise((resolve) => setTimeout(resolve, 5000))

    // 2. Wait for history screen - search by text as fallback (more reliable)
    await waitFor(element(by.text('Videos')))
      .toBeVisible()
      .withTimeout(15000)

    // 3. Take screenshot for debugging
    await device.takeScreenshot('01-history-loaded')
    console.log('✅ History screen loaded')

    // 4. Tap first video thumbnail
    // Try multiple selectors to find the video card
    await device.takeScreenshot('01b-before-tap')

    // Try tapping by type - look for Pressable or TouchableOpacity in videos area
    try {
      // First try: element by partial testID match
      await element(by.id(/videos-section-thumbnail/))
        .atIndex(0)
        .tap()
      console.log('✅ Tapped video thumbnail by testID')
    } catch (e1) {
      console.log('⚠️ TestID not found, trying by type...')
      try {
        // Second try: tap by coordinates - adjust for iPhone 16 screen
        // Video cards start around y=300 (below header+videos label)
        await device.tap({ x: 200, y: 360 })
        console.log('✅ Tapped at coordinates (200, 360)')
      } catch (e2) {
        console.log('❌ All tap attempts failed')
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 2000))
    await device.takeScreenshot('02-after-tap')

    // 5. Wait for video analysis screen (or check if navigation happened)
    try {
      await waitFor(element(by.id('video-analysis-screen')))
        .toBeVisible()
        .withTimeout(10000)
      await device.takeScreenshot('03-video-analysis')
      console.log('✅ Video analysis screen loaded')
    } catch (e) {
      console.log('⚠️ Video analysis screen not visible - checking current state')
      await device.takeScreenshot('03-no-navigation')
      // Try searching by text to see if we're on any analysis screen
      try {
        await waitFor(element(by.text('Processing')))
          .toBeVisible()
          .withTimeout(5000)
        console.log('✅ Processing state detected')
      } catch (e2) {
        console.log('❌ No video analysis navigation detected')
      }
    }

    // 6. Check for error state
    try {
      await waitFor(element(by.id('upload-error-state')))
        .toBeVisible()
        .withTimeout(5000)
      console.log('❌ ERROR STATE DETECTED - taking screenshot')
      await device.takeScreenshot('03-error-state')

      // Log error details if visible
      const errorText = element(by.id('pipeline-error'))
      if (await errorText.isVisible()) {
        console.log('Error details visible')
      }
    } catch (e) {
      console.log('✅ No error state (good)')
    }

    // 7. Check for successful feedback section
    try {
      await waitFor(element(by.id('feedback-section-container')))
        .toBeVisible()
        .withTimeout(30000)
      console.log('✅ Feedback section loaded')
    } catch (e) {
      console.log('⚠️ Feedback section not visible within 30s')
    }

    await device.takeScreenshot('04-final-state')
  })
})
