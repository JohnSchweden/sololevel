### Mistake: Memoizing Ref Values
**Wrong**:
```typescript
const ref = useRef(initialValue);
// This memo will NOT update when ref.current changes, only when dependencies change
const value = useMemo(() => ref.current, [dependency]);
```

**Correct**:
```typescript
// Use state to trigger updates, guarding against frequent updates if needed
const [value, setValue] = useState(initialValue);

const updateValue = useCallback((newValue) => {
  // Guard against unnecessary updates (e.g. during scroll)
  if (shouldUpdate(newValue)) {
    setValue(newValue);
  }
}, []);
```

### Mistake: Skipping cloud thumbnail persistence when metadata exists
**Wrong**:
```typescript
// Only persist if not using metadata thumbnail
if (cloudThumbnail && !metadataThumbnail) {
  persistThumbnailFile(videoId, cloudThumbnail)
}
```
**Lesson**: `metadata.thumbnailUri` is often a stale temp path (Library/Caches/) that gets cleared on app restart. Always persist cloud thumbnails to disk regardless of metadata existence - they're needed for recovery.

**Correct**:
```typescript
// ALWAYS persist cloud thumbnail - metadata paths may be stale temp files
if (cloudThumbnail) {
  // Check persistent cache first, then download if needed
  const persistentPath = getCachedThumbnailPath(videoId)
  const info = await FileSystem.getInfoAsync(persistentPath)
  if (!info.exists) {
    await persistThumbnailFile(videoId, cloudThumbnail)
  }
  updateCache(analysisId, { thumbnail: persistentPath })
}
```

### Mistake: Using `as any` to bypass callback type inference issues
**Wrong**:
```typescript
const unsubscribe = someFunction(arg, ((param1, param2) => {
  handleUpdate(param1, param2)
}) as any)
```
**Lesson**: Double parentheses `((` confuse TypeScript's type inference. The `as any` cast masks the real issue.

**Correct**:
```typescript
// Remove extra parentheses - let TypeScript infer the type naturally
const unsubscribe = someFunction(arg, (param1, param2) => {
  handleUpdate(param1, param2)
})
```

### Mistake: Race condition in async state updates (stale closures)
**Wrong**:
```typescript
useEffect(() => {
  asyncFn().then(res => {
     // If dependencies changed while asyncFn ran, this updates with stale data!
     setState(res) 
  })
}, [deps])
```
**Lesson**: Always use AbortController or a cleanup flag to ignore results from stale effect runs.

**Correct**:
```typescript
useEffect(() => {
  const controller = new AbortController()
  asyncFn().then(res => {
     if (controller.signal.aborted) return
     setState(res)
  })
  return () => controller.abort()
}, [deps])
```

### Mistake: Object creation in useMemo dependency array
**Wrong**:
```typescript
const stableValue = useMemo(() => {
  return data
}, [
  data.length,
  data.map(item => `${item.id}:${item.status}`).join(','), // New string every render!
])
```
**Lesson**: `.map().join()` in dependency array creates a new string on EVERY render, defeating memoization and causing garbage collection pressure.

**Correct**:
```typescript
// Create signature in separate useMemo
const signature = useMemo(() => {
  return data.map(item => `${item.id}:${item.status}`).join(',')
}, [data])

const stableValue = useMemo(() => {
  return data
}, [signature])
```

### Mistake: Missing mounted check in setTimeout callbacks
**Wrong**:
```typescript
const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

useEffect(() => {
  timerRef.current = setTimeout(() => {
    // Component might be unmounted - updates unmounted state!
    setState(newValue)
  }, 1000)
  
  return () => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }
}, [])
```
**Lesson**: Clearing timeout in cleanup doesn't prevent the callback from executing if it's already in the event loop.

**Correct**:
```typescript
const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
const isMountedRef = useRef(true)

useEffect(() => {
  timerRef.current = setTimeout(() => {
    if (!isMountedRef.current) return // Guard against unmount
    setState(newValue)
  }, 1000)
  
  return () => {
    isMountedRef.current = false
    if (timerRef.current) clearTimeout(timerRef.current)
  }
}, [])
```

### Mistake: Stale closures in setTimeout
**Wrong**:
```typescript
const handleAction = useCallback(() => {
  const currentState = getState() // Captured at callback creation
  
  setTimeout(() => {
    // Uses stale currentState from when handleAction was called!
    if (currentState.isActive) {
      doSomething()
    }
  }, 0)
}, [])
```
**Lesson**: State captured before `setTimeout` can become stale by the time the timeout executes.

**Correct**:
```typescript
const handleAction = useCallback(() => {
  setTimeout(() => {
    // Re-read fresh state inside timeout
    const currentState = getState()
    if (currentState.isActive) {
      doSomething()
    }
  }, 0)
}, [])
```

### Mistake: Clearing debug logs with shell commands instead of delete tool
**Wrong**:
```bash
rm -f /path/to/.cursor/debug.log
```

**Correct**:
```text
Use the delete-file tool for /path/to/.cursor/debug.log (don’t use rm/touch).
```

### Mistake: Claiming lint/typecheck status without running them
**Wrong**:
```text
"TypeScript errors: 0" / "Lint errors: 0" stated after only running tests.
```

**Correct**:
```text
Only report lint/typecheck status after actually running `yarn type-check` and `yarn lint` (or explicitly mark as UNVERIFIED).
```
