# Production Files Exclusion Guide

## Overview
This guide explains how to exclude production files from MVP development processes while keeping them in the repository for future use.

## 🚀 MVP Development Mode (Default)

### Configuration Files
- **TypeScript**: `tsconfig.json` - Excludes production files from type checking
- **Biome**: `biome.json` - Excludes production files from linting/formatting
- **VS Code**: `.vscode/settings.json` - Hides production files from IDE

### Commands
```bash
# MVP Development (default behavior)
yarn dev          # Only processes MVP files
yarn build        # Builds MVP only
yarn type-check   # Type-checks MVP only
yarn lint         # Lints MVP only
yarn format       # Formats MVP only

# Explicit MVP commands
yarn dev:mvp
yarn build:mvp
yarn type-check:mvp
yarn lint:mvp
yarn format:mvp
```

## 🎯 Production Development Mode

### Configuration Files
- **TypeScript**: `tsconfig.production.json` - Includes all files
- **Biome**: `biome.production.json` - Includes all files
- **Environment**: `env.prod.example` - Production settings

### Commands
```bash
# Production Development
yarn dev:prod      # Processes all files
yarn build:prod    # Builds all files
yarn type-check:prod  # Type-checks all files
yarn lint:prod     # Lints all files
yarn format:prod   # Formats all files
```

## 📁 Excluded Production Files

### Phase 1 Files (VisionCamera Migration)
- `packages/app/features/CameraRecording/hooks/useFrameProcessor.native.ts`
- `packages/app/features/CameraRecording/hooks/useCameraFrameProcessor.web.ts`
- `packages/app/features/CameraRecording/hooks/useFrameProcessing.ts`

### Phase 2 Files (Enhanced Controls & State)
- `packages/app/stores/cameraRecordingEnhanced.ts`
- `packages/app/stores/enhancedCameraStore.ts`
- `packages/app/stores/performanceStore.ts`
- `packages/app/features/CameraRecording/hooks/useAdaptiveQuality.ts`
- `packages/app/features/CameraRecording/hooks/useEnhancedZoom.ts`
- `packages/app/features/CameraRecording/hooks/useEnhancedCameraSwap.ts`
- `packages/app/features/CameraRecording/hooks/useRecordingStateMachine.ts`
- `packages/app/features/CameraRecording/hooks/useThermalMonitoring.native.ts`
- `packages/ui/src/components/CameraRecording/PerformanceMonitor.tsx`
- `packages/ui/src/components/CameraRecording/ThermalIndicator.tsx`
- `packages/ui/src/components/CameraRecording/CameraSwapButton.tsx`

### Phase 3 Files (AI Integration & Pose Detection)
- `packages/app/stores/poseStore.ts`
- `packages/app/features/CameraRecording/hooks/usePoseDetection.native.ts`
- `packages/app/features/CameraRecording/hooks/usePoseDetection.web.ts`
- `packages/app/features/CameraRecording/hooks/usePoseMetrics.ts`
- `packages/app/features/CameraRecording/hooks/usePoseState.ts`
- `packages/app/features/CameraRecording/config/poseConfigManager.ts`
- `packages/app/features/CameraRecording/config/poseDetectionConfig.ts`
- `packages/app/features/CameraRecording/utils/poseDataBuffer.ts`
- `packages/app/features/CameraRecording/utils/poseDataExport.ts`
- `packages/app/features/CameraRecording/utils/poseDataValidation.ts`
- `packages/app/features/CameraRecording/utils/poseStateIntegrationTest.ts`
- `packages/app/features/CameraRecording/utils/poseStatePersistence.ts`
- `packages/app/features/CameraRecording/utils/poseThermalIntegration.ts`
- `packages/app/features/CameraRecording/utils/storeEnhancementMigration.ts`
- `packages/app/features/CameraRecording/worklets/poseProcessing.native.ts`
- `packages/app/features/CameraRecording/workers/poseDetection.web.ts`
- `packages/ui/src/components/CameraRecording/PoseOverlay.native.tsx`
- `packages/ui/src/components/CameraRecording/PoseOverlay.web.tsx`
- `packages/app/features/CameraRecording/types/pose.ts`
- `packages/app/features/CameraRecording/types/enhanced-state.ts`
- `packages/app/features/CameraRecording/types/performance.ts`
- `packages/app/features/CameraRecording/types/thermal.ts`
- `packages/app/features/CameraRecording/types/cross-platform-state.ts`

## 🔄 Switching Between Modes

### To Enable Production Mode
1. Copy environment file: `cp env.prod.example .env.prod`
2. Use production commands: `yarn dev:prod`, `yarn build:prod`, etc.

### To Return to MVP Mode
1. Copy environment file: `cp env.dev.example .env.dev`
2. Use default commands: `yarn dev`, `yarn build`, etc.

## 🎯 Benefits

### MVP Development
- **🚀 Fast Development**: Only processes essential files
- **🔄 Quick Iteration**: Faster builds and type checking
- **📁 Clean Workspace**: Production files hidden from IDE
- **🛡️ No Conflicts**: Production files don't interfere with MVP

### Production Development
- **🎯 Full Feature Set**: Access to all advanced features
- **📈 Complete Testing**: Test all production functionality
- **🔧 Advanced Debugging**: Full debugging capabilities
- **📊 Performance Analysis**: Complete performance monitoring

## 🚨 Important Notes

1. **File Preservation**: Production files remain in the repository
2. **Git Tracking**: All files are still tracked by Git
3. **Build Safety**: Production files won't break MVP builds
4. **Easy Switching**: Simple command changes to switch modes
5. **Team Consistency**: All developers can use the same exclusion rules

## 🔧 Customization

### Adding New Production Files
1. Add file pattern to `tsconfig.json` exclude array
2. Add file pattern to `biome.json` ignore arrays
3. Add file pattern to `.vscode/settings.json` exclude arrays

### Removing Exclusions
1. Remove file pattern from all configuration files
2. Restart TypeScript server in VS Code
3. Clear any cached builds

## 📚 Related Documentation
- [Phase 1: VisionCamera Migration](../features/camera-recording/migration/phase1-visioncamera-migration.md)
- [Phase 2: Enhanced Controls & State](../features/camera-recording/migration/phase2-enhanced-controls-state.md)
- [Phase 3: AI Integration & Pose Detection](../features/camera-recording/migration/phase3-ai-integration-pose-detection.md)
