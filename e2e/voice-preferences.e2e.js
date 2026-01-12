const { device, element, by, waitFor } = require('detox')
const {
  createTestUser,
  deleteTestUser,
  getUserVoicePreferences,
  getLatestAnalysisJob,
  getAnalysisJobByVoiceConfig,
} = require('./helpers/supabaseAdmin')
const { spawn } = require('node:child_process')
const path = require('node:path')
// Use global.expect from Jest (Detox overrides expect for element matchers)
const { expect: jestExpect } = require('@jest/globals')

// Increase Jest timeout for Metro startup and test execution
jest.setTimeout(300000) // 5 minutes

describe('Voice Preferences E2E', () => {
  let testUser = null
  let metroProcess = null
  let supabaseFunctionsProcess = null
  let firstPipelineRecordingId = null // Store recording ID from first pipeline test

  beforeAll(async () => {
    // Kill any existing Supabase functions processes before starting
    try {
      const { execSync } = require('node:child_process')
      execSync('pkill -f "supabase functions serve" || true', {
        stdio: 'ignore',
        shell: true,
      })
      execSync('pkill -f "deno run.*edge-runtime" || true', {
        stdio: 'ignore',
        shell: true,
      })
      console.log('🧹 Cleaned up pre-existing function server processes')
      await new Promise((resolve) => setTimeout(resolve, 2000))
    } catch (e) {
      // No processes to kill or pkill not available
    }

    // Check if Supabase functions server is already running
    let supabaseAlreadyRunning = false
    try {
      const response = await fetch('http://127.0.0.1:54321/functions/v1/ai-analyze-video')
      supabaseAlreadyRunning = response.status === 404 || response.ok
      console.log('✅ Supabase functions server is already running')
    } catch (e) {
      console.log('📦 Supabase functions not running, will start it...')
    }

    // Start Supabase functions server only if not already running
    if (!supabaseAlreadyRunning) {
      console.log('🚀 Starting Supabase functions server...')
      const projectRoot = path.join(__dirname, '..')

      supabaseFunctionsProcess = spawn('yarn', ['db:serve:local'], {
        cwd: projectRoot,
        stdio: 'pipe', // Capture output but don't show it
        shell: true,
      })

      // Wait for Supabase functions to be ready
      console.log('⏳ Waiting for Supabase functions to be ready...')
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Supabase functions failed to start in 60 seconds'))
        }, 60000)

        const checkSupabase = async () => {
          try {
            const response = await fetch('http://127.0.0.1:54321/functions/v1/ai-analyze-video')
            if (response.status === 404 || response.ok) {
              clearTimeout(timeout)
              console.log('✅ Supabase functions server is ready\n')
              resolve()
              return
            }
          } catch (e) {
            // Not ready yet, check again in 2 seconds
          }
          setTimeout(checkSupabase, 2000)
        }

        // Start checking after 10 seconds to give Supabase time to start
        setTimeout(checkSupabase, 10000)

        supabaseFunctionsProcess.on('error', (error) => {
          clearTimeout(timeout)
          reject(error)
        })
      })
    }

    // Check if Metro is already running
    let metroAlreadyRunning = false
    try {
      const response = await fetch('http://localhost:8081/status')
      metroAlreadyRunning = response.ok
      console.log('✅ Metro bundler is already running')
    } catch (e) {
      console.log('📦 Metro not running, will start it...')
    }

    // Start Metro bundler only if not already running
    if (!metroAlreadyRunning) {
      console.log('🚀 Starting Metro bundler...')
      console.log('📺 Metro output will be displayed below:\n')
      const projectRoot = path.join(__dirname, '..')

      metroProcess = spawn('yarn', ['native'], {
        cwd: projectRoot,
        stdio: 'inherit', // This will show Metro output in the same terminal
        shell: true,
      })

      // Wait for Metro to be ready by checking if it's listening on port 8081
      console.log('\n⏳ Waiting for Metro to be ready...')
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Metro bundler failed to start in 120 seconds'))
        }, 120000)

        const checkMetro = async () => {
          try {
            const response = await fetch('http://localhost:8081/status')
            if (response.ok) {
              clearTimeout(timeout)
              console.log('\n✅ Metro bundler is ready\n')
              resolve()
              return
            }
          } catch (e) {
            // Metro not ready yet, check again in 1 second
          }
          setTimeout(checkMetro, 1000)
        }

        // Start checking after 5 seconds to give Metro time to start
        setTimeout(checkMetro, 5000)

        metroProcess.on('error', (error) => {
          clearTimeout(timeout)
          reject(error)
        })
      })
    }

    // Launch app with permissions (after Metro is ready)
    console.log('📱 Launching app...')
    await device.launchApp({
      newInstance: true,
      permissions: { camera: 'YES', photos: 'YES' },
    })

    // Give app a moment to initialize
    await new Promise((resolve) => setTimeout(resolve, 3000))

    // Handle Expo Dev Client launcher screen - tap on localhost to load app
    console.log('📱 Checking for Expo Dev Client launcher...')
    try {
      await waitFor(element(by.text('http://localhost:8081')))
        .toBeVisible()
        .withTimeout(10000)
      console.log('📱 Expo Dev Client launcher detected, connecting to Metro...')
      await element(by.text('http://localhost:8081')).tap()
      // Wait for app to bundle and load from Metro
      console.log('⏳ Waiting for app to bundle...')
      await new Promise((resolve) => setTimeout(resolve, 1000))
    } catch (e) {
      console.log('✅ Already connected to Metro or launcher not shown')
    }

    // Wait for app to fully load and show sign-in screen
    console.log('⏳ Waiting for sign-in screen to appear...')
    try {
      await waitFor(element(by.id('sign-in-screen')))
        .toBeVisible()
        .withTimeout(30000)
      console.log('✅ App loaded and sign-in screen visible')
    } catch (e) {
      console.log('⚠️  Sign-in screen not found')
      throw new Error('App did not load properly - sign-in screen not visible')
    }

    // Create a fresh test user with NULL preferences (first login)
    const timestamp = Date.now()
    const email = `test-voice-${timestamp}@example.com`
    const password = `testpass-${timestamp}`
    testUser = await createTestUser(email, password)
    testUser.password = password

    console.log('✅ Test user created:', testUser.email)
  })

  afterAll(async () => {
    // Cleanup test user
    if (testUser?.userId) {
      try {
        await deleteTestUser(testUser.userId)
        console.log('✅ Test user cleaned up')
      } catch (error) {
        // Failed to cleanup test user - non-fatal
      }
    }

    // Stop Supabase functions server with proper cleanup
    if (supabaseFunctionsProcess) {
      console.log('🛑 Stopping Supabase functions server...')

      try {
        // Try graceful shutdown first
        supabaseFunctionsProcess.kill('SIGTERM')
        await new Promise((resolve) => setTimeout(resolve, 2000))

        // Force kill if still running
        try {
          supabaseFunctionsProcess.kill('SIGKILL')
          console.log('✅ Supabase functions server force stopped')
        } catch (e) {
          // Process already terminated
          console.log('✅ Supabase functions server stopped gracefully')
        }
      } catch (error) {
        // Error stopping Supabase functions - non-fatal
      }

      // Additional cleanup: kill any orphaned deno/supabase processes
      try {
        const { execSync } = require('node:child_process')
        execSync('pkill -f "supabase functions serve" || true', {
          stdio: 'ignore',
          shell: true,
        })
        execSync('pkill -f "deno run.*edge-runtime" || true', {
          stdio: 'ignore',
          shell: true,
        })
        console.log('✅ Cleaned up any orphaned function server processes')
      } catch (e) {
        // No processes to kill or pkill not available
      }
    }

    // Stop Metro bundler
    if (metroProcess) {
      console.log('🛑 Stopping Metro bundler...')
      try {
        metroProcess.kill('SIGTERM')
        await new Promise((resolve) => setTimeout(resolve, 1000))

        // Force kill if needed
        try {
          metroProcess.kill('SIGKILL')
        } catch (e) {
          // Already stopped
        }
      } catch (error) {
        // Error stopping Metro - non-fatal
      }
    }
  })

  describe('Voice Selection Screen - First Login', () => {
    it('should show voice selection on first login and save to DB', async () => {
      console.log('📱 Test: First login voice selection flow')

      // Disable synchronization for more reliable navigation
      await device.disableSynchronization()

      // 1. Sign in with fresh test user
      console.log('🔑 Signing in...')
      await waitFor(element(by.id('sign-in-screen')))
        .toBeVisible()
        .withTimeout(10000)

      await element(by.id('email-input')).typeText(testUser.email)
      await element(by.id('password-input')).typeText(testUser.password)
      await element(by.id('sign-in-button')).tap()

      // 2. Wait for voice selection screen (should auto-redirect because coach_mode is NULL)
      console.log('⏳ Waiting for voice selection screen...')
      await waitFor(element(by.id('voice-selection-screen')))
        .toBeVisible()
        .withTimeout(5000)

      // Give screen time to fully render all components
      console.log('⏳ Waiting for screen to fully render...')
      await new Promise((resolve) => setTimeout(resolve, 1000))

      await device.takeScreenshot('01-voice-selection-screen')

      // 3. Verify default selections are visible (female + roast are preselected by default)
      console.log('✅ Verifying preselected defaults are visible...')

      // NOTE: Sync is already disabled from line 141 - keep it off for entire test
      // due to Tamagui animations / Image transitions keeping main queue busy

      // Mode selector (now appears FIRST in the layout, with roast preselected)
      await waitFor(element(by.id('mode-selector')))
        .toExist()
        .withTimeout(15000)

      await waitFor(element(by.id('mode-selector-roast')))
        .toBeVisible()
        .withTimeout(5000)

      // Gender selector (now appears SECOND, with female preselected)
      await waitFor(element(by.id('gender-selector')))
        .toExist()
        .withTimeout(5000)

      await waitFor(element(by.id('gender-selector-female')))
        .toBeVisible()
        .withTimeout(5000)

      console.log('✅ Defaults visible (female + roast preselected)')

      // 4. Change from defaults (female + roast) to different values (male + zen)
      console.log('🧘 Changing from roast to zen...')

      // Scroll to ensure mode zen option is fully visible (may be partially off-screen)
      await waitFor(element(by.id('mode-selector-zen')))
        .toBeVisible()
        .whileElement(by.id('voice-selection-screen'))
        .scroll(200, 'down')

      await element(by.id('mode-selector-zen')).tap()

      // Wait for the UI to update and verify zen is now selected
      await waitFor(element(by.id('mode-selector-zen')))
        .toBeVisible()
        .withTimeout(3000)
      console.log('✅ Mode changed to zen')

      console.log('👤 Changing from female to male...')
      await element(by.id('gender-selector-male')).tap()

      // Wait for the UI to update and verify male is now selected
      await waitFor(element(by.id('gender-selector-male')))
        .toBeVisible()
        .withTimeout(3000)
      console.log('✅ Gender changed to male')

      // Give UI time to fully update
      await new Promise((resolve) => setTimeout(resolve, 1000))
      await device.takeScreenshot('02-voice-selection-changed')

      // 5. Tap continue button to save preferences
      console.log('▶️  Tapping continue to save preferences...')
      await element(by.id('continue-button')).tap()

      // Wait for save to complete (button shows "Saving..." then navigates)
      console.log('⏳ Waiting for preferences to save...')
      await new Promise((resolve) => setTimeout(resolve, 3000))

      // 6. Verify redirect to home (voice selection screen should disappear)
      console.log('⏳ Waiting for redirect to home...')
      await waitFor(element(by.id('voice-selection-screen')))
        .not.toBeVisible()
        .withTimeout(10000)

      await new Promise((resolve) => setTimeout(resolve, 2000))
      await device.takeScreenshot('03-after-voice-selection')

      // 7. Query DB and verify preferences were saved
      console.log('🗄️  Verifying database state...')
      const preferences = await getUserVoicePreferences(testUser.userId)

      jestExpect(preferences.coachGender).toBe('male')
      jestExpect(preferences.coachMode).toBe('zen')

      console.log('✅ First login test passed - preferences saved to DB')
    })
  })

  describe('Personalisation Screen - Change Preferences', () => {
    it('should update preferences via settings and save to DB', async () => {
      console.log('📱 Test: Update preferences via settings')

      // 1. Navigate to settings/personalisation via deep link
      console.log('🔗 Navigating to personalisation settings...')
      await device.openURL({ url: 'sololevel:///settings/personalisation' })

      await new Promise((resolve) => setTimeout(resolve, 3000))

      // 2. Wait for personalisation screen
      console.log('⏳ Waiting for personalisation screen...')
      await waitFor(element(by.id('personalisation-screen')))
        .toBeVisible()
        .withTimeout(15000)

      await device.takeScreenshot('04-personalisation-screen')

      // Scroll down to ensure voice preferences are visible
      try {
        await element(by.id('personalisation-screen')).scrollTo('top')
      } catch (e) {
        console.log('⚠️  Could not scroll (might be at top already)')
      }

      await new Promise((resolve) => setTimeout(resolve, 1000))
      await device.takeScreenshot('05-personalisation-scrolled')

      // 3. Change voice gender to female
      console.log('👤 Changing gender to female...')

      // Look for the female radio option within voice-gender-radio
      // The testID pattern from SettingsRadioGroup is: {testID}-{option.value}
      await waitFor(element(by.id('voice-gender-radio-female')))
        .toBeVisible()
        .withTimeout(5000)

      await element(by.id('voice-gender-radio-female')).tap()
      await new Promise((resolve) => setTimeout(resolve, 1000))

      await device.takeScreenshot('06-gender-changed')

      // 4. Change mode to lovebomb
      console.log('💗 Changing mode to lovebomb...')

      await waitFor(element(by.id('voice-mode-radio-lovebomb')))
        .toBeVisible()
        .withTimeout(5000)

      await element(by.id('voice-mode-radio-lovebomb')).tap()
      await new Promise((resolve) => setTimeout(resolve, 1000))

      await device.takeScreenshot('07-mode-changed')

      // 5. Wait for sync (optimistic update + database sync)
      console.log('⏳ Waiting for database sync...')
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // 6. Query DB and verify preferences were updated
      console.log('🗄️  Verifying database state...')
      const preferences = await getUserVoicePreferences(testUser.userId)

      jestExpect(preferences.coachGender).toBe('female')
      jestExpect(preferences.coachMode).toBe('lovebomb')

      console.log('✅ Settings test passed - preferences updated in DB')
    })
  })

  describe('Pipeline Test - Initial Voice Config', () => {
    it('should complete analysis pipeline with selected voice config', async () => {
      console.log('📱 Test: Pipeline with zen/male voice config')

      // User currently has zen/male from previous test
      // Navigate to pipeline test screen
      console.log('🔗 Navigating to pipeline test...')
      await device.openURL({ url: 'sololevel:///dev/pipeline-test' })

      await new Promise((resolve) => setTimeout(resolve, 3000))

      // Wait for pipeline test screen
      console.log('⏳ Waiting for pipeline test screen...')
      await waitFor(element(by.id('pipeline-test-screen')))
        .toBeVisible()
        .withTimeout(15000)

      await device.takeScreenshot('08-pipeline-test-screen')

      // Tap run pipeline button
      console.log('▶️  Tapping run pipeline button...')
      await element(by.id('pipeline-run')).tap()

      await new Promise((resolve) => setTimeout(resolve, 2000))
      await device.takeScreenshot('09-pipeline-running')

      // Wait for redirect to video analysis screen (may take time for upload + analysis)
      console.log('⏳ Waiting for video analysis screen...')
      await waitFor(element(by.id('video-analysis-screen')))
        .toBeVisible()
        .withTimeout(60000) // 60s timeout for upload + redirect

      await device.takeScreenshot('10-video-analysis-loading')

      // Wait for feedback section to appear (indicates analysis complete)
      console.log('⏳ Waiting for analysis to complete...')
      await waitFor(element(by.id('feedback-section-container')))
        .toBeVisible()
        .withTimeout(120000) // 2 minute timeout for AI analysis

      await new Promise((resolve) => setTimeout(resolve, 3000))
      await device.takeScreenshot('11-analysis-complete')

      console.log('✅ Pipeline test completed - analysis successful')
    })
  })

  describe('History Verification', () => {
    it('should show correct voice config in history', async () => {
      console.log('📱 Test: History verification with zen/male config')

      // Navigate back to recording (to ensure we can navigate to history)
      console.log('🔗 Navigating back to recording...')
      await device.openURL({ url: 'sololevel:///' })

      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Navigate to history
      console.log('🔗 Navigating to history...')
      await device.openURL({ url: 'sololevel:///history-progress' })

      await new Promise((resolve) => setTimeout(resolve, 3000))

      // Wait for history screen
      console.log('⏳ Waiting for history screen...')
      await waitFor(element(by.text('Videos')))
        .toBeVisible()
        .withTimeout(15000)

      await device.takeScreenshot('12-history-screen')

      // Tap first video thumbnail - try multiple strategies
      console.log('📼 Tapping first video...')

      let navigationSuccessful = false
      const tapStrategies = [
        {
          name: 'coordinates-upper',
          action: async () => {
            await device.tap({ x: 200, y: 300 })
            console.log('Tried tap at (200, 300)')
          },
        },
        {
          name: 'coordinates-mid',
          action: async () => {
            await device.tap({ x: 200, y: 360 })
            console.log('Tried tap at (200, 360)')
          },
        },
        {
          name: 'coordinates-lower',
          action: async () => {
            await device.tap({ x: 200, y: 420 })
            console.log('Tried tap at (200, 420)')
          },
        },
        {
          name: 'swipe-and-tap',
          action: async () => {
            // Ensure we're at the top of the list
            await element(by.id('videos-section-list')).scrollTo('top')
            await new Promise((resolve) => setTimeout(resolve, 500))
            await device.tap({ x: 200, y: 360 })
            console.log('Tried scroll-to-top and tap at (200, 360)')
          },
        },
      ]

      for (const strategy of tapStrategies) {
        try {
          console.log(`🎯 Trying tap strategy: ${strategy.name}`)
          await strategy.action()
          await new Promise((resolve) => setTimeout(resolve, 2000))

          // Check if navigation happened
          try {
            await waitFor(element(by.id('video-analysis-screen')))
              .toBeVisible()
              .withTimeout(5000)
            navigationSuccessful = true
            console.log(`✅ Navigation successful with strategy: ${strategy.name}`)
            break
          } catch (e) {
            console.log(`⚠️  Strategy ${strategy.name} failed, trying next...`)
            // Navigate back to history for next attempt
            await device.openURL({ url: 'sololevel:///history-progress' })
            await waitFor(element(by.text('Videos')))
              .toBeVisible()
              .withTimeout(5000)
            await new Promise((resolve) => setTimeout(resolve, 1000))
          }
        } catch (e) {
          console.log(`❌ Tap strategy ${strategy.name} error:`, e.message)
        }
      }

      if (!navigationSuccessful) {
        console.log('⏳ All tap strategies failed, trying final attempt with longer timeout...')
        // Final attempt with longer timeout
        await device.tap({ x: 200, y: 360 })
        await waitFor(element(by.id('video-analysis-screen')))
          .toBeVisible()
          .withTimeout(20000)
      }

      await device.takeScreenshot('13-after-successful-navigation')

      await new Promise((resolve) => setTimeout(resolve, 3000))
      await device.takeScreenshot('14-history-video-loaded')

      // Query DB and verify voice config snapshot
      // Use getAnalysisJobByVoiceConfig to find the job from the FIRST pipeline (male/zen)
      // instead of getLatestAnalysisJob which would return the second pipeline (female/lovebomb)
      console.log('🗄️  Verifying analysis job voice config...')
      const analysisJob = await getAnalysisJobByVoiceConfig(testUser.userId, 'male', 'zen')

      jestExpect(analysisJob.coach_gender).toBe('male')
      jestExpect(analysisJob.coach_mode).toBe('zen')
      jestExpect(analysisJob.voice_name_used).toBeTruthy()
      jestExpect(analysisJob.avatar_asset_key_used).toBeTruthy()

      console.log('✅ History verification passed - voice config snapshot correct')
      console.log(`   Gender: ${analysisJob.coach_gender}, Mode: ${analysisJob.coach_mode}`)
      console.log(
        `   Voice: ${analysisJob.voice_name_used}, Avatar: ${analysisJob.avatar_asset_key_used}`
      )
    })
  })

  describe('Voice Config Change - Round 2', () => {
    it('should change voice preferences to lovebomb/female', async () => {
      console.log('📱 Test: Changing voice config to lovebomb/female')

      // Navigate to settings/personalisation via deep link
      console.log('🔗 Navigating to personalisation settings...')
      await device.openURL({ url: 'sololevel:///settings/personalisation' })

      await new Promise((resolve) => setTimeout(resolve, 3000))

      // Wait for personalisation screen
      console.log('⏳ Waiting for personalisation screen...')
      await waitFor(element(by.id('personalisation-screen')))
        .toBeVisible()
        .withTimeout(15000)

      await device.takeScreenshot('15-personalisation-screen-second')

      // Scroll to top to ensure voice preferences are visible
      try {
        await element(by.id('personalisation-screen')).scrollTo('top')
      } catch (e) {
        console.log('⚠️  Could not scroll (might be at top already)')
      }

      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Change voice gender to female (if not already)
      console.log('👤 Changing gender to female...')
      await waitFor(element(by.id('voice-gender-radio-female')))
        .toBeVisible()
        .withTimeout(5000)

      await element(by.id('voice-gender-radio-female')).tap()
      await new Promise((resolve) => setTimeout(resolve, 1000))

      await device.takeScreenshot('16-gender-changed-to-female')

      // Change mode to lovebomb
      console.log('💗 Changing mode to lovebomb...')
      await waitFor(element(by.id('voice-mode-radio-lovebomb')))
        .toBeVisible()
        .withTimeout(5000)

      await element(by.id('voice-mode-radio-lovebomb')).tap()
      await new Promise((resolve) => setTimeout(resolve, 1000))

      await device.takeScreenshot('17-mode-changed-to-lovebomb')

      // Wait for sync (optimistic update + database sync)
      console.log('⏳ Waiting for database sync...')
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Query DB and verify preferences were updated
      console.log('🗄️  Verifying database state...')
      const preferences = await getUserVoicePreferences(testUser.userId)

      jestExpect(preferences.coachGender).toBe('female')
      jestExpect(preferences.coachMode).toBe('lovebomb')

      console.log('✅ Voice config changed to lovebomb/female')
    })
  })

  describe('Pipeline Test - New Voice Config', () => {
    it('should complete second pipeline with new voice config', async () => {
      console.log('📱 Test: Second pipeline with lovebomb/female voice config')

      // Navigate to pipeline test screen
      console.log('🔗 Navigating to pipeline test...')
      await device.openURL({ url: 'sololevel:///dev/pipeline-test' })

      await new Promise((resolve) => setTimeout(resolve, 3000))

      // Wait for pipeline test screen
      console.log('⏳ Waiting for pipeline test screen...')
      await waitFor(element(by.id('pipeline-test-screen')))
        .toBeVisible()
        .withTimeout(15000)

      await device.takeScreenshot('18-pipeline-test-screen-second')

      // Tap run pipeline button
      console.log('▶️  Tapping run pipeline button...')
      await element(by.id('pipeline-run')).tap()

      await new Promise((resolve) => setTimeout(resolve, 2000))
      await device.takeScreenshot('19-pipeline-running-second')

      // Wait for redirect to video analysis screen
      console.log('⏳ Waiting for video analysis screen...')
      await waitFor(element(by.id('video-analysis-screen')))
        .toBeVisible()
        .withTimeout(60000) // 60s timeout for upload + redirect

      await device.takeScreenshot('20-video-analysis-loading-second')

      // Wait for feedback section to appear (indicates analysis complete)
      console.log('⏳ Waiting for analysis to complete...')
      await waitFor(element(by.id('feedback-section-container')))
        .toBeVisible()
        .withTimeout(120000) // 2 minute timeout for AI analysis

      await new Promise((resolve) => setTimeout(resolve, 3000))
      await device.takeScreenshot('21-analysis-complete-second')

      // Query DB and verify new voice config was used
      console.log('🗄️  Verifying new voice config in analysis job...')
      const analysisJob = await getLatestAnalysisJob(testUser.userId)

      jestExpect(analysisJob.coach_gender).toBe('female')
      jestExpect(analysisJob.coach_mode).toBe('lovebomb')
      jestExpect(analysisJob.voice_name_used).toBeTruthy()
      jestExpect(analysisJob.avatar_asset_key_used).toBeTruthy()

      // Verify voice matches expected config (Gacrux for female/lovebomb per seed data)
      jestExpect(analysisJob.voice_name_used).toBe('Gacrux')
      jestExpect(analysisJob.avatar_asset_key_used).toBe('female_lovebomb')

      console.log('✅ Second pipeline test passed - new voice config applied')
      console.log(`   Gender: ${analysisJob.coach_gender}, Mode: ${analysisJob.coach_mode}`)
      console.log(
        `   Voice: ${analysisJob.voice_name_used}, Avatar: ${analysisJob.avatar_asset_key_used}`
      )
    })
  })
})
