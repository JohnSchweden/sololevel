/** @type {Detox.DetoxConfig} */
module.exports = {
  testRunner: {
    args: {
      $0: 'jest',
      config: 'e2e/jest.config.js',
    },
    jest: {
      setupFilesAfterEnv: ['<rootDir>/e2e/setup.js'],
    },
  },
  apps: {
    'ios.debug': {
      type: 'ios.app',
      binaryPath: 'apps/expo/ios/build/Build/Products/Debug-iphonesimulator/sololevel.app',
      build:
        'cd apps/expo/ios && xcodebuild -workspace SoloLevel.xcworkspace -scheme SoloLevel -configuration Debug -sdk iphonesimulator -derivedDataPath build -destination "platform=iOS Simulator,name=iPhone 16 Pro" build CODE_SIGNING_ALLOWED=NO',
      launchArgs: {
        // Tell Expo to connect to Metro bundler
        EXDevMenuIsOnboardingFinished: true,
      },
    },
    'ios.release': {
      type: 'ios.app',
      binaryPath: 'apps/expo/ios/build/Build/Products/Release-iphonesimulator/sololevel.app',
      build:
        'cd apps/expo && EXPO_NO_TELEMETRY=1 yarn ios --configuration Release --device "iPhone 16 Pro"',
    },
    'android.debug': {
      type: 'android.apk',
      binaryPath: 'apps/expo/android/app/build/outputs/apk/debug/app-debug.apk',
      build: 'cd apps/expo && EXPO_NO_TELEMETRY=1 yarn android --variant debug',
    },
    'android.release': {
      type: 'android.apk',
      binaryPath: 'apps/expo/android/app/build/outputs/apk/release/app-release.apk',
      build: 'cd apps/expo && EXPO_NO_TELEMETRY=1 yarn android --variant release',
    },
  },
  devices: {
    simulator: {
      type: 'ios.simulator',
      device: {
        type: 'iPhone 16 Pro',
      },
    },
    attached: {
      type: 'android.attached',
      device: {
        adbName: '.*',
      },
    },
    emulator: {
      type: 'android.emulator',
      device: {
        avdName: 'Pixel_7_API_33',
      },
    },
  },
  configurations: {
    'ios.sim.debug': {
      device: 'simulator',
      app: 'ios.debug',
    },
    'ios.sim.release': {
      device: 'simulator',
      app: 'ios.release',
    },
    'android.att.debug': {
      device: 'attached',
      app: 'android.debug',
    },
    'android.att.release': {
      device: 'attached',
      app: 'android.release',
    },
    'android.emu.debug': {
      device: 'emulator',
      app: 'android.debug',
    },
    'android.emu.release': {
      device: 'emulator',
      app: 'android.release',
    },
  },
}
