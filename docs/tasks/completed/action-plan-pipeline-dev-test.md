# Action Plan: Pipeline Dev Screen & Maestro Test Implementation

## Overview
Create a development screen and automated Maestro test to validate the complete video upload and analysis pipeline that was recently refactored into the `startUploadAndAnalysis` service.

## Context
- **Problem**: Need integration testing for the refactored video pipeline
- **Solution**: Dev screen + Maestro test to exercise real upload→analysis flow
- **Scope**: End-to-end validation from video selection to analysis completion
- **Dependencies**: Existing `startUploadAndAnalysis` service, `VideoAnalysisScreen`, Supabase backend

## Implementation Tasks

### Task 1: Create Pipeline Test Dev Screen
**File**: `apps/expo/app/dev/pipeline-test.tsx`

#### Requirements
- Minimal UI with test controls and status display
- Reuse existing `mini_speech.mp4` asset from compress-test
- Call `startUploadAndAnalysis` service directly
- Navigate to `VideoAnalysisScreen` immediately after trigger
- Display real-time upload/analysis status
- Handle both success and error scenarios

#### Implementation Details
```typescript
// Key components needed:
- Asset loading from mini_speech.mp4
- startUploadAndAnalysis service integration
- Router navigation to video-analysis screen
- Upload progress store integration
- Error state handling
- TestID attributes for Maestro automation
```

#### UI Elements Required
- **Title**: "Pipeline Test" (testID: `pipeline-test-title`)
- **Status Text**: Shows current state (testID: `pipeline-status`)
- **Details Panel**: JSON/text details (testID: `pipeline-details`)
- **Run Button**: Triggers pipeline (testID: `pipeline-run`)
- **Reset Button**: Clear state (testID: `pipeline-reset`)

#### State Management
- Track pipeline phases: `idle` → `loading-asset` → `uploading` → `processing` → `completed`/`failed`
- Use `useUploadProgressStore` for real-time upload progress
- Display `videoRecordingId` when available
- Show error messages from upload failures

### Task 2: Update App Routing
**File**: `apps/expo/app/_layout.tsx`

#### Requirements
- Add Stack.Screen for `dev/pipeline-test`
- Ensure proper navigation flow
- Maintain existing dev screen patterns

#### Implementation
```typescript
<Stack.Screen
  name="dev/pipeline-test"
  options={{
    title: 'Pipeline Test',
    headerShown: true,
  }}
/>
```

### Task 3: Add Navigation Access
**File**: `packages/app/features/CameraRecording/CameraRecordingScreen.vision.tsx`

#### Requirements
- Add button to access pipeline test screen
- Follow existing dev button pattern
- Proper testID for Maestro access

#### Implementation
```typescript
<Button
  onPress={() => router.push('/dev/pipeline-test')}
  testID="dev-pipeline-test-button"
>
  Pipeline Test
</Button>
```

### Task 4: Create Maestro Test
**File**: `.maestro/pipeline-test.yaml`

#### Requirements
- Automated end-to-end pipeline validation
- Handle timing variations in upload/analysis
- Assert key UI states and transitions
- Robust error detection

#### Test Flow
1. **Setup**: Launch app, clear state
2. **Navigation**: Access pipeline test screen
3. **Trigger**: Tap run pipeline button
4. **Upload Phase**: Assert uploading status appears
5. **Processing Phase**: Wait for analysis to start
6. **Completion**: Verify VideoAnalysisScreen loads
7. **Validation**: Check for success indicators
8. **Cleanup**: Return to initial state

#### Maestro Script Structure
```yaml
appId: com.sololevel.app
---
- launchApp:
    clearState: true
- tapOn:
    text: "http://localhost:8081"
    optional: true
- tapOn:
    text: "Continue"
    optional: true
- tapOn:
    point: "10%,10%"
    optional: true
- tapOn:
    id: "dev-pipeline-test-button"
- tapOn:
    id: "pipeline-run"
- assertVisible:
    id: "pipeline-status"
- waitForAnimationToEnd
- assertVisible:
    text: "uploading"
    timeout: 10000
- waitForAnimationToEnd
- assertVisible:
    text: "processing"
    timeout: 30000
- assertVisible:
    id: "video-analysis-container"
    timeout: 60000
```

### Task 5: Add Package Script
**File**: `package.json`

#### Requirements
- Add yarn script for pipeline Maestro test
- Follow existing test script patterns
- Include proper PATH setup for Maestro

#### Implementation
```json
{
  "scripts": {
    "test:native:pipeline": "PATH=\"$PATH:$HOME/.maestro/bin:/opt/homebrew/opt/openjdk/bin\" maestro test .maestro/pipeline-test.yaml"
  }
}
```

### Task 6: Integration Validation
#### Requirements
- Manual testing of complete flow
- Verify error scenarios work
- Confirm Maestro test passes
- Performance validation

## Definition of Done (DoD)

### Functional Requirements ✅
- [ ] **Dev Screen Created**: `apps/expo/app/dev/pipeline-test.tsx` exists and renders
- [ ] **Asset Loading**: Successfully loads `mini_speech.mp4` from bundle
- [ ] **Service Integration**: Calls `startUploadAndAnalysis` with correct parameters
- [ ] **Navigation**: Immediately navigates to VideoAnalysisScreen after trigger
- [ ] **Status Display**: Shows real-time upload progress and analysis status
- [ ] **Error Handling**: Displays upload failures with retry options
- [ ] **Route Added**: Pipeline test accessible via app routing
- [ ] **Dev Access**: Button added to main screen for easy access

### Test Requirements ✅
- [ ] **Maestro Test Created**: `.maestro/pipeline-test.yaml` exists
- [ ] **Test Passes**: Maestro test successfully completes end-to-end flow
- [ ] **Timing Handled**: Test accommodates variable upload/analysis timing
- [ ] **Error Detection**: Test can detect and report failures
- [ ] **Script Added**: `yarn test:native:pipeline` command works

### Code Quality ✅
- [ ] **TypeScript**: All files pass `yarn type-check`
- [ ] **Linting**: All files pass `yarn lint`
- [ ] **Testing**: Unit tests updated if needed
- [ ] **Logging**: Proper logging with `@my/logging`
- [ ] **Error Boundaries**: Graceful error handling

### Integration Requirements ✅
- [ ] **Upload Flow**: Video uploads successfully to Supabase Storage
- [ ] **Analysis Trigger**: Backend automatically starts analysis after upload
- [ ] **Real-time Updates**: VideoAnalysisScreen receives live analysis updates
- [ ] **State Management**: Upload progress store correctly tracks state
- [ ] **ID Propagation**: `videoRecordingId` properly flows through system
- [ ] **Error Recovery**: Failed uploads show appropriate UI

### Performance Requirements ✅
- [ ] **Asset Loading**: < 2 seconds to load test video
- [ ] **Upload Speed**: Reasonable upload progress for test file
- [ ] **UI Responsiveness**: No blocking operations on main thread
- [ ] **Memory Usage**: No memory leaks during test cycles

### Documentation Requirements ✅
- [ ] **Code Comments**: Key functions documented
- [ ] **TestID Documentation**: All testIDs documented for Maestro
- [ ] **Error Scenarios**: Known failure modes documented
- [ ] **Usage Instructions**: How to run tests documented

## Prerequisites for Testing

### Environment Setup
1. **Expo Development**: `yarn native` running
2. **Supabase Backend**: Local or remote Supabase accessible
3. **Environment Variables**: Proper `.env` configuration
4. **Maestro Installed**: Maestro CLI available in PATH
5. **Device/Simulator**: iOS Simulator or Android emulator

### Backend Dependencies
1. **Storage Bucket**: Configured with proper CORS
2. **Database**: Video recording and analysis job tables
3. **Edge Functions**: Auto-analysis trigger function deployed
4. **Authentication**: Test user or anonymous access configured

### Network Requirements
1. **Internet Access**: For Supabase API calls
2. **File Upload**: Storage bucket accessible
3. **Real-time**: WebSocket connections for live updates

## Risk Mitigation

### Timing Issues
- **Problem**: Variable upload/analysis timing
- **Solution**: Generous timeouts in Maestro, status polling
- **Fallback**: Manual verification if automated test flaky

### Backend Dependencies
- **Problem**: Supabase backend unavailable
- **Solution**: Clear error messages, fallback to mock mode
- **Monitoring**: Health checks before running tests

### Asset Loading
- **Problem**: Bundle asset not found
- **Solution**: Verify asset exists, fallback error handling
- **Validation**: Check file size and format

### State Management
- **Problem**: Upload store state conflicts
- **Solution**: Reset store state between test runs
- **Cleanup**: Clear active uploads after tests

## Success Criteria

### Primary Goals
1. **End-to-End Validation**: Complete pipeline works from video selection to analysis
2. **Automated Testing**: Maestro test reliably validates pipeline
3. **Developer Experience**: Easy to run and debug pipeline issues
4. **Error Visibility**: Clear feedback when pipeline fails

### Secondary Goals
1. **Performance Baseline**: Establish timing expectations
2. **Regression Prevention**: Catch pipeline breaks early
3. **Documentation**: Reference implementation for pipeline usage
4. **Debugging Aid**: Tool for investigating pipeline issues

## Execution Timeline

### Phase 1: Core Implementation (2-3 hours)
- Create dev screen with basic UI
- Integrate `startUploadAndAnalysis` service
- Add routing and navigation
- Basic error handling

### Phase 2: Maestro Test (1-2 hours)
- Create Maestro test file
- Test and refine timing/assertions
- Add package script
- Validate test reliability

### Phase 3: Polish & Validation (1 hour)
- Add comprehensive error states
- Improve UI feedback
- Documentation updates
- Final testing

**Total Estimated Time**: 4-6 hours

## Next Steps After Completion

1. **Integration with CI**: Add pipeline test to automated CI/CD
2. **Performance Monitoring**: Track upload/analysis timing trends
3. **Error Analytics**: Monitor pipeline failure rates
4. **User Testing**: Validate real-world pipeline performance
5. **Documentation**: Update developer guides with pipeline testing

---

**Created**: 2025-09-24  
**Owner**: Development Team  
**Priority**: High  
**Dependencies**: Completed video pipeline refactoring
