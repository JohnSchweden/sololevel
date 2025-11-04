Analyzing the codebase to identify `.expo`-related code and what remains for vision. Following the step-by-step process.


[22 tools called]

## Phase 1: Codebase Analysis Results

### Relevant Files Found:

**Expo Implementation Files (to DELETE):**
- `packages/app/features/CameraRecording/CameraRecordingScreen.expo.tsx`
- `packages/app/features/CameraRecording/stores/cameraRecording.expo.ts`
- `packages/app/features/CameraRecording/hooks/useCameraPermissions.native.expo.ts`
- `packages/ui/src/components/CameraRecording/CameraPreview/CameraPreview.native.expo.tsx`
- `packages/ui/src/components/CameraRecording/CameraPreview/CameraPreview.native.expo.test.tsx`

**Hybrid Wrapper Files (to SIMPLIFY):**
- `packages/app/features/CameraRecording/CameraRecordingScreenWrapper.tsx` - Remove Expo branch, directly use vision
- `packages/app/features/CameraRecording/stores/cameraRecording.ts` - Remove Expo fallback logic
- `packages/app/features/CameraRecording/hooks/useCameraPermissions.native.ts` - Remove Expo branch
- `packages/ui/src/components/CameraRecording/CameraPreview/CameraPreview.native.tsx` - Remove Expo fallback

**Configuration Files (to UPDATE):**
- `packages/app/stores/feature-flags.ts` - Remove `useVisionCamera` flag (always true)
- `scripts/toggles/toggle-camera.sh` - Remove or update script
- `env.example` - Remove `EXPO_PUBLIC_USE_VISION_CAMERA` reference

### Code Conventions Identified:
- Named exports only (no default exports)
- TypeScript strict mode
- Feature flag pattern using Zustand store
- Dynamic require() for conditional imports
- Hybrid wrapper pattern for feature flag routing

### Key Dependencies & Patterns:
- `react-native-vision-camera` - VisionCamera implementation
- `expo-camera` - Expo Camera (to be removed)
- Zustand for feature flags
- Dynamic imports via `require()` for conditional loading

---

## Phase 2: Implementation Plan

### Module: Remove Expo Camera Implementation Files
**Summary:** Delete all `.expo.tsx`, `.expo.ts`, and `.expo.test.tsx` files since they're no longer needed.

**Tasks:**
- [ ] Delete `CameraRecordingScreen.expo.tsx`
- [ ] Delete `cameraRecording.expo.ts`
- [ ] Delete `useCameraPermissions.native.expo.ts`
- [ ] Delete `CameraPreview.native.expo.tsx`
- [ ] Delete `CameraPreview.native.expo.test.tsx`

**Acceptance Criteria:**
- [ ] All `.expo` files removed from codebase
- [ ] No broken imports remain

### Module: Simplify CameraRecordingScreenWrapper
**Summary:** Remove wrapper logic and directly export vision implementation, or eliminate wrapper entirely.

**Tasks:**
- [ ] Remove feature flag check from `CameraRecordingScreenWrapper.tsx`
- [ ] Directly import and use `CameraRecordingScreen.vision`
- [ ] Update `CameraRecordingScreen.tsx` to import vision directly (or remove wrapper)

**Acceptance Criteria:**
- [ ] Wrapper no longer conditionally loads implementations
- [ ] Vision camera always used
- [ ] No feature flag dependencies

### Module: Simplify Store Implementation
**Summary:** Remove hybrid store logic, directly export vision store.

**Tasks:**
- [ ] Update `cameraRecording.ts` to directly export from `cameraRecording.vision`
- [ ] Remove environment variable checks
- [ ] Remove fallback logic

**Acceptance Criteria:**
- [ ] Store always uses vision implementation
- [ ] No conditional logic remains
- [ ] All exports point to vision store

### Module: Simplify Camera Permissions Hook
**Summary:** Remove hybrid permissions hook, directly use vision implementation.

**Tasks:**
- [ ] Update `useCameraPermissions.native.ts` to directly export from `.vision`
- [ ] Remove feature flag routing
- [ ] Remove Expo fallback

**Acceptance Criteria:**
- [ ] Permissions hook always uses vision implementation
- [ ] No conditional routing

### Module: Simplify CameraPreview Component
**Summary:** Remove hybrid preview logic, directly use vision implementation.

**Tasks:**
- [ ] Update `CameraPreview.native.tsx` to directly export from `.vision`
- [ ] Remove feature flag checks
- [ ] Remove fallback logic

**Acceptance Criteria:**
- [ ] Preview always uses vision implementation
- [ ] No conditional component loading

### Module: Clean Up Feature Flags
**Summary:** Remove `useVisionCamera` flag from feature flags store.

**Tasks:**
- [ ] Remove `useVisionCamera` from `FeatureFlags` interface
- [ ] Remove flag from default flags
- [ ] Remove environment variable handling for camera flag
- [ ] Update any tests that reference the flag

**Acceptance Criteria:**
- [ ] No `useVisionCamera` references in feature flags
- [ ] No environment variable checks for camera type
- [ ] Tests pass

### Module: Update Supporting Files
**Summary:** Clean up scripts, env examples, and documentation.

**Tasks:**
- [ ] Remove or update `toggle-camera.sh` script
- [ ] Remove `EXPO_PUBLIC_USE_VISION_CAMERA` from `env.example`
- [ ] Update README.md if it references camera toggle

**Acceptance Criteria:**
- [ ] No camera toggle script or updated with warning
- [ ] Environment examples cleaned up
- [ ] Documentation accurate

---

## Phase 3: Implementation

### Step 1: Delete Expo Implementation Files

Delete these files:
```bash
rm packages/app/features/CameraRecording/CameraRecordingScreen.expo.tsx
rm packages/app/features/CameraRecording/stores/cameraRecording.expo.ts
rm packages/app/features/CameraRecording/hooks/useCameraPermissions.native.expo.ts
rm packages/ui/src/components/CameraRecording/CameraPreview/CameraPreview.native.expo.tsx
rm packages/ui/src/components/CameraRecording/CameraPreview/CameraPreview.native.expo.test.tsx
```

### Step 2: Simplify CameraRecordingScreenWrapper

Replace `CameraRecordingScreenWrapper.tsx`:

```typescript
import { ProfilerWrapper } from '@ui/components/Performance'
import { CameraRecordingScreenProps } from './types'
import { CameraRecordingScreen as VisionCameraScreen } from './CameraRecordingScreen.vision'

/**
 * Camera Recording Screen - VisionCamera implementation only
 * Previously used feature flags to switch between VisionCamera and Expo Camera
 * Now exclusively uses VisionCamera
 */
export function CameraRecordingScreenWrapper({
  onVideoProcessed,
  onHeaderStateChange,
  onBackPress,
  onDevNavigate,
  resetToIdle,
}: CameraRecordingScreenProps) {
  return (
    <ProfilerWrapper
      id="CameraRecordingScreen"
      logToConsole={__DEV__}
    >
      <VisionCameraScreen
        onVideoProcessed={onVideoProcessed}
        onHeaderStateChange={onHeaderStateChange}
        onBackPress={onBackPress}
        onDevNavigate={onDevNavigate}
        resetToIdle={resetToIdle}
      />
    </ProfilerWrapper>
  )
}
```

### Step 3: Simplify Store Implementation

Replace `packages/app/features/CameraRecording/stores/cameraRecording.ts`:

```typescript
// Camera recording store - VisionCamera implementation only
export { useCameraRecordingStore } from './cameraRecording.vision'
```

### Step 4: Simplify Camera Permissions Hook

Replace `packages/app/features/CameraRecording/hooks/useCameraPermissions.native.ts` (keep the base implementation, remove the wrapper):

Remove the wrapper function `useCameraPermissions` and directly export from vision:

```typescript
// ... keep all the base interfaces and useBaseCameraPermissions ...

// Directly export vision implementation
export { useCameraPermissions, useCameraPermissionStatus } from './useCameraPermissions.native.vision'
```

### Step 5: Simplify CameraPreview Component

Replace `packages/ui/src/components/CameraRecording/CameraPreview/CameraPreview.native.tsx`:

```typescript
import { forwardRef } from 'react'
import type { CameraPreviewContainerProps, CameraPreviewRef } from '../types'
import { VisionCameraPreview } from './CameraPreview.native.vision'

/**
 * Camera Preview Component - VisionCamera implementation only
 * Previously used feature flags to switch between VisionCamera and Expo Camera
 * Now exclusively uses VisionCamera
 */
export const CameraPreview = forwardRef<CameraPreviewRef, CameraPreviewContainerProps>(
  (props, ref) => {
    return (
      <VisionCameraPreview
        {...props}
        ref={ref}
      />
    )
  }
)

CameraPreview.displayName = 'CameraPreview'
```

### Step 6: Clean Up Feature Flags

Update `packages/app/stores/feature-flags.ts`:

```typescript
// Remove from FeatureFlags interface:
export interface FeatureFlags {
  // Development flags
  enableDevMode: boolean
  showDebugInfo: boolean
  useMockData: boolean

  // REMOVED: useVisionCamera - always using VisionCamera now

  // Feature flags
  enableNewUi: boolean
  // ... rest of flags
}

// Remove from defaultFlags:
const defaultFlags: FeatureFlags = {
  // ... other flags
  // REMOVED: useVisionCamera
  // ... rest
}

// Remove from loadFlags function:
// Remove the EXPO_PUBLIC_USE_VISION_CAMERA environment variable handling
```

### Step 7: Update Supporting Files

Update `scripts/toggles/toggle-camera.sh`:

```bash
#!/bin/bash

# Camera implementation toggle script - DEPRECATED
# VisionCamera is now the only implementation
# This script is kept for backwards compatibility but does nothing

echo "⚠️  Camera toggle script is deprecated"
echo "   VisionCamera is now the only implementation"
echo "   No action needed"
```

Update `env.example` - remove the `EXPO_PUBLIC_USE_VISION_CAMERA` line.

### Step 8: Update Store Exports

The `packages/app/features/CameraRecording/stores/index.ts` should already be correct since it exports from `.vision`, but verify it doesn't reference `.expo`.

---

## Summary

**Files to DELETE:** 5 files
**Files to MODIFY:** 6 files  
**Files to UPDATE:** 3 files (scripts, env, feature flags)

After completion:
- ✅ No `.expo` files remain
- ✅ All wrappers simplified to use vision directly
- ✅ Feature flag removed
- ✅ Environment variables cleaned up
- ✅ Scripts updated/deprecated

**Note:** You're in ask mode, so I can't apply these changes. Switch to agent mode to proceed, or I can provide the exact file edits for you to apply.