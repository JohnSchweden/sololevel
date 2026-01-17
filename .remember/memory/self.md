### Mistake: Using useEffect for store initialization that affects first render
**Wrong**:
```typescript
// Store props set via useEffect - runs AFTER paint
useEffect(() => {
  storeSetter({ shouldRender: true, ...props })
}, [deps])
// Result: Component conditionally rendered from store value doesn't appear until second frame
```

**Correct**:
```typescript
// Store props set via useLayoutEffect - runs BEFORE paint
useLayoutEffect(() => {
  storeSetter({ shouldRender: true, ...props })
}, [deps])
// Result: Store updated synchronously, component renders on first frame
```

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

### Mistake: Using browser-only APIs (atob/btoa) in React Native
**Wrong**:
```typescript
// atob is browser-only, crashes React Native with ReferenceError
const decoded = atob(base64String)
```
**Lesson**: `atob()` and `btoa()` are Web APIs not available in React Native's JavaScript environment. Using them causes immediate crashes on launch.

**Correct**:
```typescript
// Manual base64 decode for React Native compatibility
function base64Decode(base64: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='
  let output = ''
  const padded = base64.replace(/[^A-Za-z0-9+/]/g, '')
  const padding = padded.length % 4
  const input = padding ? padded + '===='.slice(padding) : padded
  for (let i = 0; i < input.length; i += 4) {
    const enc1 = chars.indexOf(input[i])
    const enc2 = chars.indexOf(input[i + 1])
    const enc3 = chars.indexOf(input[i + 2])
    const enc4 = chars.indexOf(input[i + 3])
    output += String.fromCharCode((enc1 << 2) | (enc2 >> 4))
    if (enc3 !== 64) output += String.fromCharCode(((enc2 & 15) << 4) | (enc3 >> 2))
    if (enc4 !== 64) output += String.fromCharCode(((enc3 & 3) << 6) | enc4)
  }
  return output
}
```

### Mistake: Testing internal implementation instead of user behavior
**Wrong**:
```typescript
// Testing internal function directly with complex setup
it('prependToHistoryCache prepends item', () => {
  // 50+ lines of mock setup
  // Call internal function directly
  // Assert internal state
})
```
**Lesson**: Internal functions are implementation details. Test via public API behavior. Follow 1:2 ratio rule.

**Correct**:
```typescript
// Test the BEHAVIOR that triggers the function (fallback path)
it('prepends to history when job completes without title', async () => {
  // Simple setup - mock only external deps
  await store.subscribe('job:3', { analysisJobId: 3 })
  jobHandler?.(completedJob)
  jest.advanceTimersByTime(3000) // Fallback timeout
  
  // Assert user-visible outcome
  expect(cache[0]).toMatchObject({ id: 3, title: expect.stringMatching(/Analysis/) })
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

### Mistake: Timeout on User Interaction (Video Trimming)
**Wrong**:
```typescript
// Arbitrary timeout for user action - user might take longer!
const timeout = setTimeout(() => reject('timeout'), 60000)
// Result: Native UI stays open, but JS promise rejects. User saves file -> ignored.
```
**Lesson**: Never put timeouts on user-driven UI flows (pickers, trimmers, auth screens) unless the system itself has a hard limit.

**Correct**:
```typescript
// Let the user cancel via the UI, don't auto-cancel from code
return new Promise((resolve) => {
  // No timeout
  nativeModule.onFinish(resolve)
  nativeModule.onCancel(resolve)
})
```

### Mistake: Using supabase_functions.http_request with WHEN clause
**Wrong**:
```sql
-- WHEN clause is IGNORED - fires on EVERY UPDATE
CREATE TRIGGER my_trigger AFTER UPDATE ON my_table
FOR EACH ROW WHEN (NEW.status = 'specific_status')
EXECUTE FUNCTION supabase_functions.http_request(...);
```
**Lesson**: `supabase_functions.http_request` (Dashboard webhooks) ignores WHEN clauses, causing infinite loops when handlers update the same table.

**Correct**:
```sql
-- Use custom function with guards in function body
CREATE FUNCTION trigger_my_webhook() RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'specific_status' AND OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM net.http_post(...);
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER my_trigger AFTER UPDATE ON my_table
FOR EACH ROW EXECUTE FUNCTION trigger_my_webhook();
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

### Mistake: Adding subscriptions to imperative-read hooks
**Wrong**:
```typescript
// BREAKS: Hook was designed to NOT subscribe to prevent re-renders
// Adding subscriptions defeats the entire optimization strategy!
const storeValue = useMyStore(state => state.someValue) // NEW SUBSCRIPTION = NEW RE-RENDERS

return useMemo(() => {
  return { value: storeValue }
}, [storeValue])
```
**Lesson**: When a hook explicitly documents "NO REACT STATE - reads imperatively via getState()", adding subscriptions breaks the performance architecture. Read the JSDoc comments before "fixing" perceived staleness issues.

**Correct**:
```typescript
// Keep imperative reads for hooks that are designed this way
// Consumers subscribe to stores directly, not via this hook's return value
return useMemo(() => {
  const storeValue = useMyStore.getState().someValue
  return { value: storeValue } // Deprecated, backward compat only
}, [otherDeps])
// Consumers: useMyStore(state => state.someValue) directly
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