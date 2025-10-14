# Memory Management Tools

This directory contains scripts for detecting and preventing memory leaks in the codebase.

## Available Scripts

### 1. memory-leak-detector.mjs

Comprehensive memory leak detection tool that scans TypeScript files for common memory leak patterns.

**Usage:**
```bash
node scripts/ops/memory-leak-detector.mjs
```

**What it detects:**
- ✅ Supabase Auth subscriptions without cleanup
- ✅ Zustand stores with Maps lacking cleanup methods
- ✅ Realtime subscriptions without unsubscribe
- ✅ Timers (setTimeout/setInterval) without cleanup
- ✅ useEffect hooks with subscriptions/listeners lacking return cleanup
- ✅ Refs holding large objects without nulling

**Exit codes:**
- `0` - No critical issues found
- `1` - Critical issues or store issues detected (CI-friendly)

**Configuration:**
Edit the script to change scan paths or exclusion patterns:
```javascript
const SCAN_PATHS = ['packages/app', 'apps/expo/app', 'packages/ui/src'];
const EXCLUDED_PATTERNS = ['**/__tests__/**', '**/*.backup'];
```

### 2. analyze-useeffects.mjs (Legacy)

Original useEffect analyzer focused specifically on useEffect cleanup patterns.

**Usage:**
```bash
node analyze-useeffects.mjs
```

**What it does:**
- Categorizes useEffect hooks by type
- Identifies missing cleanup functions
- Focuses on MVP-scoped files only

## Integration Options

### Local Development

Run manually when:
- Adding new subscriptions
- Creating new Zustand stores
- Working with timers or event listeners
- Before committing large features

### Pre-commit Hook

Add to `.husky/pre-commit`:
```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Run memory leak detector
node scripts/ops/memory-leak-detector.mjs || {
  echo "⚠️  Memory leaks detected. Review the output above."
  exit 1
}
```

### CI Pipeline

Add to GitHub Actions workflow:
```yaml
- name: Memory Leak Detection
  run: node scripts/ops/memory-leak-detector.mjs
```

The script exits with code 1 on critical issues, failing the build.

## Common Memory Leak Patterns

### Pattern 1: Missing useEffect Cleanup

❌ **Bad:**
```typescript
useEffect(() => {
  const timer = setInterval(() => {
    log.info('tick');
  }, 1000);
}, []);
```

✅ **Good:**
```typescript
useEffect(() => {
  const timer = setInterval(() => {
    log.info('tick');
  }, 1000);
  
  return () => clearInterval(timer);
}, []);
```

### Pattern 2: Zustand Store Without Cleanup

❌ **Bad:**
```typescript
export const useMyStore = create<MyStore>()(
  immer((set) => ({
    subscriptions: new Map(),
    items: new Map(),
    // ... no cleanup method
  }))
);
```

✅ **Good:**
```typescript
export const useMyStore = create<MyStore>()(
  immer((set) => ({
    subscriptions: new Map(),
    items: new Map(),
    
    cleanup: () => set((draft) => {
      draft.subscriptions.forEach(unsub => unsub());
      draft.subscriptions.clear();
      draft.items.clear();
    }),
  }))
);
```

### Pattern 3: Supabase Subscription Without Cleanup

❌ **Bad:**
```typescript
useEffect(() => {
  supabase.channel('my-channel')
    .on('postgres_changes', { ... }, handler)
    .subscribe();
}, []);
```

✅ **Good:**
```typescript
useEffect(() => {
  const channel = supabase.channel('my-channel')
    .on('postgres_changes', { ... }, handler)
    .subscribe();
  
  return () => {
    channel.unsubscribe();
  };
}, []);
```

### Pattern 4: Auth Subscription Leak

❌ **Bad:**
```typescript
const initialize = async () => {
  // This creates a new subscription every call!
  supabase.auth.onAuthStateChange((event, session) => {
    updateState(session);
  });
};
```

✅ **Good:**
```typescript
let authSubscription = null;

const initialize = async () => {
  authSubscription = supabase.auth.onAuthStateChange((event, session) => {
    updateState(session);
  });
};

const cleanup = () => {
  if (authSubscription) {
    authSubscription.data.subscription.unsubscribe();
    authSubscription = null;
  }
};
```

## Report Interpretation

### Critical Leaks
**Severity:** 🚨 CRITICAL  
**Action:** Fix immediately  
**Impact:** Accumulates rapidly, causes app instability

### Store Issues
**Severity:** ⚠️ HIGH  
**Action:** Add cleanup methods  
**Impact:** Maps grow indefinitely, memory bloat

### Subscription Leaks
**Severity:** ⚠️ HIGH  
**Action:** Add unsubscribe in cleanup  
**Impact:** Background listeners waste resources

### Timer Leaks
**Severity:** 🟡 MEDIUM-HIGH  
**Action:** Clear timers in cleanup  
**Impact:** CPU cycles wasted, battery drain

### Potential Issues
**Severity:** 🟢 LOW-MEDIUM  
**Action:** Review and verify  
**Impact:** May or may not be actual leaks

## Best Practices

1. **Always return cleanup** from useEffect when:
   - Creating subscriptions
   - Setting timers
   - Adding event listeners
   - Storing refs to large objects

2. **Zustand stores should have:**
   - `cleanup()` or `reset()` method
   - Call `.clear()` on all Maps
   - Unsubscribe all subscriptions

3. **Supabase patterns:**
   - Store channel reference
   - Call `channel.unsubscribe()` in cleanup
   - Auth subscriptions must be unsubscribed

4. **Mobile-specific:**
   - Be extra careful with setInterval (battery)
   - Clean up camera/video refs
   - Remove native event listeners (AppState, Dimensions)

## Troubleshooting

### Too Many False Positives

The detector may flag patterns that are actually safe. Common false positives:
- Test files (already excluded)
- Subscriptions with cleanup in different functions
- Intentional global subscriptions

Adjust `EXCLUDED_PATTERNS` in the script to filter them out.

### Script Not Finding Issues

The detector uses heuristics and may miss:
- Complex cleanup patterns
- Cleanup in separate files
- Non-standard patterns

Manual code review is still important.

### Performance Issues

If the script is slow:
- Narrow `SCAN_PATHS`
- Add more exclusion patterns
- Run on specific directories only

## Further Reading

- [React useEffect Hook Documentation](https://react.dev/reference/react/useEffect)
- [Zustand Cleanup Patterns](https://github.com/pmndrs/zustand)
- [Supabase Realtime Subscriptions](https://supabase.com/docs/guides/realtime)
- Memory profiling tools:
  - Chrome DevTools Memory Profiler
  - React DevTools Profiler
  - React Native Performance Monitor

## Contributing

To improve the memory leak detector:

1. Add new pattern detectors in the `PATTERN DETECTORS` section
2. Update severity levels based on actual impact
3. Improve heuristics for false positive reduction
4. Add new categories to the report

## License

Internal tool - part of the Solo:Level project.

