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
