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
        'cd apps/expo && EXPO_NO_TELEMETRY=1 npx expo run:ios --configuration Debug --device "iPhone 15"',
    },
    'ios.release': {
      type: 'ios.app',
      binaryPath: 'apps/expo/ios/build/Build/Products/Release-iphonesimulator/sololevel.app',
      build:
        'cd apps/expo && EXPO_NO_TELEMETRY=1 npx expo run:ios --configuration Release --device "iPhone 15"',
    },
    'android.debug': {
      type: 'android.apk',
      binaryPath: 'apps/expo/android/app/build/outputs/apk/debug/app-debug.apk',
      build: 'cd apps/expo && EXPO_NO_TELEMETRY=1 npx expo run:android --variant debug',
    },
    'android.release': {
      type: 'android.apk',
      binaryPath: 'apps/expo/android/app/build/outputs/apk/release/app-release.apk',
      build: 'cd apps/expo && EXPO_NO_TELEMETRY=1 npx expo run:android --variant release',
    },
  },
  devices: {
    simulator: {
      type: 'ios.simulator',
      device: {
        type: 'iPhone 15',
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
