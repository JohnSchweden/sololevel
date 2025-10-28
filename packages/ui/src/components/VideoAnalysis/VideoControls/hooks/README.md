# useControlsVisibility Hook

> Centralized management of video controls visibility with auto-hide timer and tap-to-toggle functionality.

## Overview

The `useControlsVisibility` hook extracts all controls visibility logic from the `VideoControls` component, providing a reusable, testable, and maintainable solution for managing video control panel visibility.

**Key Features:**
- ✅ Auto-hide timer with configurable delay
- ✅ Tap-to-toggle show/hide functionality
- ✅ External prop synchronization (`showControls`)
- ✅ Scrubbing state awareness (prevent auto-hide during user interaction)
- ✅ Proper cleanup on unmount (prevents memory leaks)
- ✅ Comprehensive error handling

## Files

- **`useControlsVisibility.ts`** - Hook implementation (235 lines)
- **`useControlsVisibility.test.ts`** - Comprehensive test suite (655 lines, 17 test cases)
- **`FLOW_DIAGRAM.md`** - Visual state machine & timer lifecycle diagrams
- **`README.md`** - This file

## Quick Start

```typescript
import { useControlsVisibility } from './hooks/useControlsVisibility'

export const VideoControls = ({ isPlaying, showControls, ... }) => {
  // Get values from gesture hooks
  const normalProgressBar = useProgressBarGesture({ ... })
  const isScrubbing = normalProgressBar.isScrubbing

  // Use visibility hook
  const visibility = useControlsVisibility({
    showControls,
    isPlaying,
    isScrubbing,
    autoHideDelayMs: 2000, // Optional, default is 2000
    onControlsVisibilityChange: (visible) => {
      console.log('Controls are now:', visible ? 'visible' : 'hidden')
    },
  })

  // Use returned state and handlers
  return (
    <Pressable onPress={visibility.handlePress}>
      <YStack opacity={visibility.controlsVisible ? 1 : 0}>
        {/* Controls content */}
      </YStack>
    </Pressable>
  )
}
```

## API Reference

### Input: `UseControlsVisibilityConfig`

```typescript
interface UseControlsVisibilityConfig {
  showControls: boolean
  isPlaying: boolean
  isScrubbing: boolean
  autoHideDelayMs?: number
  onControlsVisibilityChange?: (visible: boolean) => void
}
```

**Properties:**
- `showControls` - External control forcing visibility (from parent component)
- `isPlaying` - Current video playback state
- `isScrubbing` - Whether user is currently dragging the progress bar
- `autoHideDelayMs` - Milliseconds before auto-hiding (default: 2000)
- `onControlsVisibilityChange` - Callback triggered when visibility changes

### Output: `UseControlsVisibilityReturn`

```typescript
interface UseControlsVisibilityReturn {
  controlsVisible: boolean
  handlePress: () => void
  showControlsAndResetTimer: () => void
  resetAutoHideTimer: () => void
}
```

**Properties:**
- `controlsVisible` - Current visibility state (true = visible, false = hidden)
- `handlePress()` - Handler for tap-to-toggle (call from Pressable onPress)
- `showControlsAndResetTimer()` - Manually show controls + reset timer (call from user interactions)
- `resetAutoHideTimer()` - Reset timer without changing visibility (internal use)

## Behavior

### State Machine

The hook manages three states:

1. **VISIBLE (true)** - Controls are shown
   - Timer may start if conditions are met
   - User can tap to hide

2. **HIDDEN (false)** - Controls are hidden
   - No timer running
   - User can tap to show

3. **FORCED (showControls: true)** - Controls forced visible by parent
   - Always show controls
   - Reset timer if playing

### Auto-hide Timer

The timer automatically hides controls after inactivity during playback.

**Timer starts when ALL conditions are met:**
- `isPlaying: true` - Video is playing
- `isScrubbing: false` - User is not dragging
- `showControls: false` - Parent doesn't force visibility
- `controlsVisible: true` - Controls are currently visible

**Timer stops when ANY condition changes or:**
- `handlePress()` called (user tap)
- `showControlsAndResetTimer()` called (user interaction)
- `isPlaying` becomes false
- `isScrubbing` becomes true
- `showControls` becomes true

### Tap-to-Toggle

User taps the video area → `handlePress()` is called:
- If visible → hide controls, clear timer
- If hidden → show controls, start timer (if playing)

## Testing

The hook includes 17 comprehensive test cases covering:

**Auto-hide Timer (7 tests):**
- Starts when video plays
- Stops when paused
- Prevents during scrubbing
- Respects showControls prop
- Resets on user interaction
- Cleans up on unmount
- Supports custom delay

**Tap-to-Toggle (4 tests):**
- Shows hidden controls
- Hides visible controls
- Clears timer when hiding
- Starts timer when showing

**State Synchronization (4 tests):**
- Syncs with showControls on mount
- Syncs with showControls changes
- Calls callback appropriately
- Handles missing callback gracefully

**Hook Interface (2 tests):**
- Returns all required properties
- Maintains stable function references

Run tests:
```bash
yarn workspace @my/ui test useControlsVisibility.test.ts
```

## Implementation Details

### Effect Execution Order

1. **Sync Effect** - Synchronizes with `showControls` prop
   - Called on mount and when dependencies change
   - Handles initial state and transitions
   - Prevents duplicate callbacks

2. **Timer Reset Effect** - Manages auto-hide timer
   - Called when any timer condition changes
   - Evaluates all 4 conditions
   - Clears old timer, starts new if needed

3. **Cleanup Effect** - Prevents memory leaks
   - Called on unmount
   - Clears any active timer

### Key Implementation Details

**Refs used:**
- `hideTimeoutRef` - Stores active timer ID
- `prevShowControlsRef` - Tracks previous showControls value
- `isInitialMount` - Avoids duplicate callbacks on mount

**State used:**
- `controlsVisible` - Tracks current visibility
- `resetTrigger` - Forces timer effect re-run when needed

**Callbacks:**
- `resetAutoHideTimer` - Memoized with all dependencies
- `showControlsAndResetTimer` - Increments resetTrigger to trigger effect
- `handlePress` - Toggles visibility, clears/starts timer

## Diagrams & Documentation

See **`FLOW_DIAGRAM.md`** for:
- Complete state machine diagram
- Timer lifecycle flow
- Effect execution order
- Conditional timer start logic
- User interaction flows
- Sequence diagram examples

## Integration with VideoControls

The hook reduces VideoControls by **69 lines** (856 → 787 lines):

```typescript
// Before: 70+ lines of inline visibility logic
const [controlsVisible, setControlsVisible] = useState(showControls)
const hideTimeoutRef = useRef(null)
const resetAutoHideTimer = useCallback(...) // 15 lines
const showControlsAndResetTimer = useCallback(...) // 8 lines
const handlePress = useCallback(...) // 15 lines
useEffect(...) // 15 lines for sync
useEffect(...) // 5 lines for timer reset
useEffect(...) // 5 lines for cleanup

// After: 3 lines with hook
const visibility = useControlsVisibility({...})
const { controlsVisible, handlePress, showControlsAndResetTimer } = visibility
```

## Performance

- **Memoization:** All callbacks are properly memoized with correct dependencies
- **Memory:** No memory leaks - timers are always cleared
- **Re-renders:** State changes only when visibility actually changes
- **Timer efficiency:** Timer is created/destroyed as needed, never redundant

## Browser/Platform Compatibility

- Works with React 16.8+ (hooks support required)
- Cross-platform: Web, iOS, Android (via React Native)
- No platform-specific APIs used

## Future Enhancements

Possible extensions for other video components:
- Configurable animation duration
- Events for visibility changes
- Integration with video player state
- Accessibility improvements (screen reader announcements)

---

**See also:** `VideoControls.tsx` for integration example
