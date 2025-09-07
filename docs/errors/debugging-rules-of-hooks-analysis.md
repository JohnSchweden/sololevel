# Rules of Hooks Debugging Analysis

## Current Status
✅ **Hermes crash eliminated** - Removed unsafe React internals polyfill  
✅ **App boots successfully** - No more fatal crashes  
🚨 **Rules of Hooks violation persists** - Hook position 18 changes from `useCallback` to `useEffect`

## Root Cause Analysis

### Error Pattern
```
Previous render            Next render
------------------------------------------------------
18. useCallback               useEffect
   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
```

### Dependency Array Changes
```
Previous: [[object Object], function identity(a0) { [bytecode] }]
Incoming: []
```

This indicates a `useCallback` hook is losing its dependency array between renders, suggesting the callback's dependencies are becoming undefined or changing structure.

## Investigation Focus Areas

### 1. Hook Position 18 Location
Based on the hook sequence in `CameraRecordingScreen.expo.tsx`, position 18 likely corresponds to a `useCallback` in:
- `useCameraScreenLogic` hook chain
- `useRecordingStateMachine` callbacks
- Component-level callback definitions

### 2. Dependency Array Instability
The change from `[[object Object], function]` to `[]` suggests:
- A callback dependency is becoming `undefined`
- An object reference is changing between renders
- A function reference is being recreated

### 3. Conditional Hook Suspects
Despite architectural fixes, there may still be conditional logic in:
- `useCameraPermissions.native.ts` - Implementation selection
- `useRecordingStateMachine.ts` - Camera controls availability
- `useCameraScreenLogic.ts` - Callback dependency chains

## Debugging Strategy

### Phase 1: Hook Sequence Mapping
1. **Add hook position tracking**:
   ```typescript
   let hookPosition = 0;
   const trackHook = (name: string) => {
     log.info(`Hook ${++hookPosition}: ${name}`);
   };
   ```

2. **Instrument all hooks** in the component chain:
   - `useKeepAwake()` - Position 1
   - `useRef()` calls - Positions 2-3
   - `useState()` calls - Positions 4-5, 10-11
   - `useCallback()` calls - Positions 6-7, 12-13, 17-18
   - `useEffect()` calls - Positions 8-9
   - Store hooks - Positions 14-16

### Phase 2: Dependency Tracking
1. **Log all callback dependencies**:
   ```typescript
   const handleCallback = useCallback(() => {
     log.info('Callback deps:', { onNavigateBack, cameraRef, cameraReady });
   }, [onNavigateBack, cameraRef, cameraReady]);
   ```

2. **Track object reference stability**:
   ```typescript
   useEffect(() => {
     log.info('CameraControls changed:', cameraControls);
   }, [cameraControls]);
   ```

### Phase 3: React DevTools Profiler
1. **Enable Profiler** in development build
2. **Record component renders** during camera initialization
3. **Analyze hook call patterns** between renders
4. **Identify conditional hook execution**

## Immediate Action Items

### 1. Hook Position Debugging
Add temporary logging to identify exact hook at position 18:

```typescript
// In CameraRecordingScreen.expo.tsx
let hookCount = 0;
const logHook = (name: string) => {
  log.info(`Hook ${++hookCount}: ${name}`);
  return hookCount;
};

export function CameraRecordingScreen({ onNavigateBack, onTabChange }) {
  logHook('useKeepAwake'); // 1
  useKeepAwake();
  
  logHook('useRef-cameraRef'); // 2
  const cameraRef = useRef(null);
  
  // Continue logging all hooks...
}
```

### 2. Callback Dependency Stabilization
Ensure all callback dependencies are stable:

```typescript
// Stabilize props with useRef
const onNavigateBackRef = useRef(onNavigateBack);
onNavigateBackRef.current = onNavigateBack;

const stableCallback = useCallback(() => {
  onNavigateBackRef.current?.();
}, []); // Empty deps, stable reference
```

### 3. Camera Controls Investigation
The `cameraControls` object changes were addressed, but verify complete stability:

```typescript
// Add logging to track changes
useEffect(() => {
  log.info('CameraControls stability check:', {
    isReady: cameraControls?.isReady,
    hasStartRecording: !!cameraControls?.startRecording,
    refCount: cameraRef?.current ? 'present' : 'null'
  });
}, [cameraControls, cameraRef]);
```

## Next Steps

1. **Implement hook position tracking** to identify exact location of position 18
2. **Add dependency logging** to all callbacks in the component chain  
3. **Use React DevTools Profiler** to trace hook execution patterns
4. **Test with simplified component** - temporarily remove complex hooks to isolate the issue
5. **Consider hook extraction** - move complex logic to separate hooks with stable dependencies

## Expected Resolution
Once the conditional hook call is identified and eliminated, the Rules of Hooks violation should be resolved, allowing the camera screen to render without warnings.

## Files to Monitor
- `packages/app/features/CameraRecording/CameraRecordingScreen.expo.tsx`
- `packages/app/features/CameraRecording/hooks/useCameraScreenLogic.ts`
- `packages/app/features/CameraRecording/hooks/useRecordingStateMachine.ts`
- `packages/app/features/CameraRecording/hooks/useCameraPermissions.native.ts`
