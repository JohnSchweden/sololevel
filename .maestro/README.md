# Native Compression Testing with Maestro

This directory contains Maestro flows for testing native video compression functionality on real devices/simulators.

## Setup

1. **Install Maestro**: The project root `package.json` includes Maestro setup scripts
2. **Java**: Maestro requires OpenJDK (installed via Homebrew)
3. **App**: Start the Expo app with `yarn native` before running tests

## Compression Test Flow

**File**: `compression-test.yaml`

This flow tests the native video compression implementation:

1. Launches the app (bundle ID: `com.sololevel.app`)
2. Navigates to the compression test screen (dev-only)
3. Runs compression on a sample video
4. Verifies the test passes and results are displayed

## Running the Test

```bash
# From project root
yarn test:native:compression
```

Or manually:

```bash
# Ensure PATH includes Maestro and Java
export PATH="$PATH:$HOME/.maestro/bin"
export PATH="/opt/homebrew/opt/openjdk/bin:$PATH"

# Run the test (requires iOS simulator/Android emulator running)
maestro test .maestro/compression-test.yaml
```

## Test Screen

The test screen is located at `apps/expo/app/dev/compress-test.tsx` and includes:

- **Dev Button**: Red "DEV TEST" button on camera screen (only visible in `__DEV__` mode)
- **Auto-run**: Downloads sample video and runs compression
- **Results**: Displays sizes, compression ratio, and full metadata
- **Test IDs**: `run-compression`, `compression-status`, `compression-details`

## Expected Results

- **Pass**: Valid compressed URI returned, metadata present
- **Fallback**: If `react-native-video-processing` unavailable, returns original URI (sizes identical)
- **Logs**: Check device/simulator logs for detailed compression info

## Troubleshooting

- **Java not found**: `brew install openjdk` and ensure PATH includes `/opt/homebrew/opt/openjdk/bin`
- **App not found**: Ensure Expo app is built and running with `yarn native`
- **Simulator not running**: `maestro start-device` or use Xcode/Android Studio
- **Network issues**: Test downloads sample video from internet
