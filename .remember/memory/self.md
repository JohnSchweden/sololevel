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
